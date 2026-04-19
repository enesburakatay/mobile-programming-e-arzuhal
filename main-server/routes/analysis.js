const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Simple keyword-based contract type detection (mock NLP)
function detectContractType(text) {
  const lower = text.toLowerCase();

  if (lower.includes('kira') || lower.includes('kiracı') || lower.includes('ev sahibi') || lower.includes('taşınmaz')) {
    return { type: 'kira_sozlesmesi', display: 'Kira Sözleşmesi', mapped: 'RENTAL' };
  }
  if (lower.includes('satış') || lower.includes('satıcı') || lower.includes('alıcı') || lower.includes('satın al')) {
    return { type: 'satis_sozlesmesi', display: 'Satış Sözleşmesi', mapped: 'SALES' };
  }
  if (lower.includes('hizmet') || lower.includes('danışmanlık') || lower.includes('iş yapma')) {
    return { type: 'hizmet_sozlesmesi', display: 'Hizmet Sözleşmesi', mapped: 'SERVICE' };
  }
  if (lower.includes('işçi') || lower.includes('işveren') || lower.includes('çalışan') || lower.includes('maaş') || lower.includes('istihdam')) {
    return { type: 'is_sozlesmesi', display: 'İş Sözleşmesi', mapped: 'EMPLOYMENT' };
  }
  if (lower.includes('gizlilik') || lower.includes('sır') || lower.includes('ifşa') || lower.includes('nda')) {
    return { type: 'gizlilik_sozlesmesi', display: 'Gizlilik Sözleşmesi', mapped: 'NDA' };
  }
  if (lower.includes('borç') || lower.includes('borçlu') || lower.includes('alacaklı') || lower.includes('ödeme planı')) {
    return { type: 'borc_sozlesmesi', display: 'Borç Sözleşmesi', mapped: 'OTHER' };
  }
  if (lower.includes('vekalet') || lower.includes('vekil') || lower.includes('temsil')) {
    return { type: 'vekaletname', display: 'Vekaletname', mapped: 'OTHER' };
  }
  if (lower.includes('taahhüt') || lower.includes('taahhütname')) {
    return { type: 'taahhutname', display: 'Taahhütname', mapped: 'OTHER' };
  }

  return { type: 'OTHER', display: 'Genel Sözleşme', mapped: 'OTHER' };
}

// Simple entity extraction (mock NER)
function extractEntities(text) {
  const fields = {};

  // Extract amounts (numbers followed by TL, lira, etc.)
  const amountMatch = text.match(/(\d[\d.,]*)\s*(TL|tl|lira|Lira|türk lirası)/i);
  if (amountMatch) fields.tutar = amountMatch[1] + ' TL';

  // Extract dates (DD.MM.YYYY or DD/MM/YYYY)
  const dateMatch = text.match(/(\d{1,2}[./]\d{1,2}[./]\d{2,4})/);
  if (dateMatch) fields.tarih = dateMatch[1];

  // Extract names (simple pattern: capitalized words)
  const namePattern = /(?:taraflar|taraf|kiracı|ev sahibi|satıcı|alıcı|işçi|işveren|borçlu|alacaklı)[:\s]+([A-ZÇĞİÖŞÜa-zçğıöşü]+\s+[A-ZÇĞİÖŞÜa-zçğıöşü]+)/gi;
  const names = [];
  let nameMatch;
  while ((nameMatch = namePattern.exec(text)) !== null) {
    names.push(nameMatch[1].trim());
  }
  if (names.length > 0) fields.taraflar = names;

  // Extract duration
  const sureMatch = text.match(/(\d+)\s*(yıl|ay|gün|hafta)/i);
  if (sureMatch) fields.sure = `${sureMatch[1]} ${sureMatch[2]}`;

  // Extract address-like text
  const adresMatch = text.match(/(?:adres|adresinde|konumu)[:\s]+(.+?)(?:\.|,|\n|$)/i);
  if (adresMatch) fields.adres = adresMatch[1].trim();

  return fields;
}

// Generate mock GraphRAG suggestions based on contract type
function generateSuggestions(contractType) {
  const suggestionMap = {
    kira_sozlesmesi: {
      matched: [
        { field_name: 'Taraflar', name: 'Taraflar' },
        { field_name: 'Kira Bedeli', name: 'Kira Bedeli' },
      ],
      missing_required: [
        { field_name: 'Depozito Maddesi', name: 'Depozito Maddesi' },
      ],
      suggestions: [
        { field_name: 'Depozito Maddesi', message: 'Kiracıdan alınacak depozito miktarı ve iade koşulları belirtilmelidir.', necessity: 'required', usage_percent: 92 },
        { field_name: 'Fesih Koşulları', message: 'Sözleşmenin erken feshi halinde uygulanacak kurallar eklenmelidir.', necessity: 'recommended', usage_percent: 85 },
        { field_name: 'Bakım ve Onarım', message: 'Taşınmazın bakım ve onarım sorumluluklarının belirlenmesi önerilir.', necessity: 'optional', usage_percent: 73 },
      ],
    },
    satis_sozlesmesi: {
      matched: [
        { field_name: 'Taraflar', name: 'Taraflar' },
        { field_name: 'Satış Bedeli', name: 'Satış Bedeli' },
      ],
      missing_required: [
        { field_name: 'Teslim Koşulları', name: 'Teslim Koşulları' },
      ],
      suggestions: [
        { field_name: 'Teslim Koşulları', message: 'Malın teslim tarihi, yeri ve koşulları belirtilmelidir.', necessity: 'required', usage_percent: 95 },
        { field_name: 'Garanti Maddesi', message: 'Satılan mal için garanti süresi ve kapsamı eklenmelidir.', necessity: 'recommended', usage_percent: 78 },
        { field_name: 'İade Koşulları', message: 'Malın iade edilmesi halinde uygulanacak prosedür belirlenmelidir.', necessity: 'optional', usage_percent: 65 },
      ],
    },
    default: {
      matched: [
        { field_name: 'Taraflar', name: 'Taraflar' },
      ],
      missing_required: [],
      suggestions: [
        { field_name: 'Yürürlük Tarihi', message: 'Sözleşmenin yürürlüğe giriş tarihi belirtilmelidir.', necessity: 'recommended', usage_percent: 88 },
        { field_name: 'Uyuşmazlık Çözümü', message: 'Anlaşmazlık halinde başvurulacak mahkeme veya arabuluculuk yöntemi eklenmelidir.', necessity: 'recommended', usage_percent: 82 },
        { field_name: 'Tebligat Adresleri', message: 'Tarafların resmi tebligat adresleri belirtilmelidir.', necessity: 'optional', usage_percent: 70 },
      ],
    },
  };

  return suggestionMap[contractType] || suggestionMap.default;
}

// POST /api/analysis/analyze
router.post('/analyze', (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ message: 'Metin zorunludur.' });
  }

  const detected = detectContractType(text);
  const extractedFields = extractEntities(text);
  const graphragData = generateSuggestions(detected.type);

  res.json({
    contract_type: detected.mapped,
    contract_type_display: detected.display,
    nlp_result: {
      extracted_fields: extractedFields,
    },
    graphrag_result: {
      analysis: {
        matched_fields: graphragData.matched,
        missing_required: graphragData.missing_required,
      },
      suggestions: {
        suggestions: graphragData.suggestions,
      },
    },
  });
});

module.exports = router;
