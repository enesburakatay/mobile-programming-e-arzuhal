const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Mock responses for common questions (Turkish)
const MOCK_RESPONSES = {
  default: {
    response: 'Merhaba! Ben e-Arzuhal yapay zeka asistanıyım. Size sözleşmeler, hukuki süreçler ve uygulama kullanımı hakkında yardımcı olabilirim. Ne sormak istersiniz?',
    suggestedQuestions: [
      'Sözleşme nasıl oluşturulur?',
      'PDF nasıl indirilir?',
      'Hangi sözleşme tipleri destekleniyor?',
    ],
  },
  sozlesme_olusturma: {
    response: 'Sözleşme oluşturmak için şu adımları izleyin:\n\n1. Alt menüden "Yeni Sözleşme" sekmesine gidin\n2. Sözleşme başlığını ve içeriğini yazın\n3. "Analiz Et" butonuna basarak yapay zeka analizini başlatın\n4. Önerilen maddeleri inceleyin ve seçin\n5. PDF önizlemesini kontrol edin\n6. "Onaya Gönder" butonuyla sözleşmeyi kaydedin\n\nSesle yazma özelliğini de kullanabilirsiniz!',
    suggestedQuestions: [
      'Sözleşme analizi nasıl çalışır?',
      'Karşı taraf nasıl eklenir?',
      'Sözleşme durumları nelerdir?',
    ],
  },
  pdf: {
    response: 'PDF indirmek için:\n\n1. Sözleşmenizi oluşturduktan sonra "PDF Görüntüle / İndir" butonuna basın\n2. Veya Sözleşmeler listesinden ilgili sözleşmeye tıklayın\n3. Detay sayfasında PDF indirme seçeneğini kullanın\n\nPDF, sözleşme başlığı, taraflar, içerik ve imza alanlarını içerir.',
    suggestedQuestions: [
      'Sözleşme nasıl düzenlenir?',
      'Sözleşme nasıl silinir?',
      'Onay süreci nasıl işler?',
    ],
  },
  tipler: {
    response: 'e-Arzuhal şu sözleşme tiplerini desteklemektedir:\n\n• Satış Sözleşmesi - Mal alım satım işlemleri\n• Kira Sözleşmesi - Taşınmaz kiralama\n• Hizmet Sözleşmesi - Hizmet alım/sunumu\n• İş Sözleşmesi - İşçi-işveren ilişkisi\n• Gizlilik Sözleşmesi (NDA) - Gizlilik anlaşmaları\n• Diğer - Yukarıdakilere uymayan sözleşmeler\n\nYapay zeka, yazdığınız metinden sözleşme tipini otomatik tespit eder.',
    suggestedQuestions: [
      'Sözleşme nasıl oluşturulur?',
      'Kimlik doğrulama nasıl yapılır?',
      'Onay süreci nasıl işler?',
    ],
  },
};

function findResponse(message) {
  const lower = message.toLowerCase();

  if (lower.includes('oluştur') || lower.includes('nasıl yap') || lower.includes('yeni sözleşme')) {
    return MOCK_RESPONSES.sozlesme_olusturma;
  }
  if (lower.includes('pdf') || lower.includes('indir') || lower.includes('görüntüle')) {
    return MOCK_RESPONSES.pdf;
  }
  if (lower.includes('tip') || lower.includes('tür') || lower.includes('destekl') || lower.includes('hangi')) {
    return MOCK_RESPONSES.tipler;
  }

  return MOCK_RESPONSES.default;
}

// POST /api/chat
router.post('/', (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ message: 'Mesaj zorunludur.' });
  }

  const result = findResponse(message);

  res.json({
    response: result.response,
    suggestedQuestions: result.suggestedQuestions,
  });
});

module.exports = router;
