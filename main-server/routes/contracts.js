const express = require('express');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Helper: format a DB row into the JSON shape the mobile app expects
async function formatContract(row) {
  if (!row) return null;
  const { rows } = await pool.query(
    'SELECT username, first_name, last_name FROM users WHERE id = $1',
    [row.owner_id]
  );
  const owner = rows[0];
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    content: row.content,
    amount: row.amount,
    status: row.status,
    counterpartyName: row.counterparty_name,
    counterpartyRole: row.counterparty_role,
    counterpartyTcKimlik: row.counterparty_tc_kimlik,
    ownerUsername: owner ? owner.username : '',
    ownerName: owner ? `${owner.first_name} ${owner.last_name}`.trim() : '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function formatContracts(rows) {
  return Promise.all(rows.map(formatContract));
}

// GET /api/contracts/stats
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(
      `SELECT
         COUNT(*)::int AS "totalCount",
         COUNT(*) FILTER (WHERE status = 'DRAFT')::int            AS "draftCount",
         COUNT(*) FILTER (WHERE status = 'PENDING_APPROVAL')::int AS "pendingCount",
         COUNT(*) FILTER (WHERE status = 'APPROVED')::int         AS "approvedCount",
         COUNT(*) FILTER (WHERE status = 'REJECTED')::int         AS "rejectedCount"
       FROM contracts WHERE owner_id = $1`,
      [userId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// GET /api/contracts/pending-approval
router.get('/pending-approval', async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (id) * FROM (
         SELECT * FROM contracts WHERE counterparty_user_id = $1 AND status = 'PENDING_APPROVAL'
         UNION ALL
         SELECT * FROM contracts WHERE owner_id = $1 AND status = 'PENDING_APPROVAL'
       ) sub ORDER BY id, updated_at DESC`,
      [userId]
    );
    res.json(await formatContracts(rows));
  } catch (err) {
    console.error('Pending-approval error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// GET /api/contracts
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let query = 'SELECT * FROM contracts WHERE owner_id = $1';
    const params = [userId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const { rows } = await pool.query(query, params);
    res.json(await formatContracts(rows));
  } catch (err) {
    console.error('Get contracts error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// GET /api/contracts/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM contracts WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Sözleşme bulunamadı.' });
    }
    res.json(await formatContract(rows[0]));
  } catch (err) {
    console.error('Get contract error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// POST /api/contracts
router.post('/', async (req, res) => {
  try {
    const { title, type, content, amount, counterpartyName, counterpartyRole, counterpartyTcKimlik } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Başlık zorunludur.' });
    }

    const id = uuidv4();
    const userId = req.user.id;

    let counterpartyUserId = '';
    if (counterpartyTcKimlik) {
      const { rows: cpRows } = await pool.query('SELECT id FROM users WHERE tc_kimlik = $1', [counterpartyTcKimlik]);
      if (cpRows.length > 0) counterpartyUserId = cpRows[0].id;
    }

    await pool.query(
      `INSERT INTO contracts (id, owner_id, title, type, content, amount, counterparty_name, counterparty_role, counterparty_tc_kimlik, counterparty_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, userId, title, type || 'OTHER', content || '', amount || '', counterpartyName || '', counterpartyRole || '', counterpartyTcKimlik || '', counterpartyUserId]
    );

    const { rows } = await pool.query('SELECT * FROM contracts WHERE id = $1', [id]);
    res.status(201).json(await formatContract(rows[0]));
  } catch (err) {
    console.error('Create contract error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// PUT /api/contracts/:id
router.put('/:id', async (req, res) => {
  try {
    const { rows: existing } = await pool.query(
      'SELECT * FROM contracts WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Sözleşme bulunamadı.' });
    }

    const { title, type, content, amount, counterpartyName, counterpartyRole, counterpartyTcKimlik } = req.body;

    await pool.query(
      `UPDATE contracts SET
         title = COALESCE($1, title),
         type = COALESCE($2, type),
         content = COALESCE($3, content),
         amount = COALESCE($4, amount),
         counterparty_name = COALESCE($5, counterparty_name),
         counterparty_role = COALESCE($6, counterparty_role),
         counterparty_tc_kimlik = COALESCE($7, counterparty_tc_kimlik),
         updated_at = NOW()
       WHERE id = $8`,
      [title ?? null, type ?? null, content ?? null, amount ?? null,
       counterpartyName ?? null, counterpartyRole ?? null, counterpartyTcKimlik ?? null,
       req.params.id]
    );

    const { rows } = await pool.query('SELECT * FROM contracts WHERE id = $1', [req.params.id]);
    res.json(await formatContract(rows[0]));
  } catch (err) {
    console.error('Update contract error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// DELETE /api/contracts/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rows: existing } = await pool.query(
      'SELECT * FROM contracts WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Sözleşme bulunamadı.' });
    }

    await pool.query('DELETE FROM contracts WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    console.error('Delete contract error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// POST /api/contracts/:id/finalize
router.post('/:id/finalize', async (req, res) => {
  try {
    const { rows: existing } = await pool.query(
      'SELECT * FROM contracts WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Sözleşme bulunamadı.' });
    }
    if (existing[0].status !== 'DRAFT') {
      return res.status(400).json({ message: 'Sadece taslak sözleşmeler onaya gönderilebilir.' });
    }

    await pool.query(
      "UPDATE contracts SET status = 'PENDING_APPROVAL', updated_at = NOW() WHERE id = $1",
      [req.params.id]
    );
    const { rows } = await pool.query('SELECT * FROM contracts WHERE id = $1', [req.params.id]);
    res.json(await formatContract(rows[0]));
  } catch (err) {
    console.error('Finalize error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// POST /api/contracts/:id/approve
router.post('/:id/approve', async (req, res) => {
  try {
    const { rows: existing } = await pool.query('SELECT * FROM contracts WHERE id = $1', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Sözleşme bulunamadı.' });
    }
    if (existing[0].status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ message: 'Sadece beklemedeki sözleşmeler onaylanabilir.' });
    }

    await pool.query(
      "UPDATE contracts SET status = 'APPROVED', updated_at = NOW() WHERE id = $1",
      [req.params.id]
    );
    res.status(204).send();
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// POST /api/contracts/:id/reject
router.post('/:id/reject', async (req, res) => {
  try {
    const { rows: existing } = await pool.query('SELECT * FROM contracts WHERE id = $1', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Sözleşme bulunamadı.' });
    }
    if (existing[0].status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ message: 'Sadece beklemedeki sözleşmeler reddedilebilir.' });
    }

    await pool.query(
      "UPDATE contracts SET status = 'REJECTED', updated_at = NOW() WHERE id = $1",
      [req.params.id]
    );
    res.status(204).send();
  } catch (err) {
    console.error('Reject error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// GET /api/contracts/:id/pdf
router.get('/:id/pdf', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM contracts WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Sözleşme bulunamadı.' });
    }
    const row = rows[0];

    const { rows: ownerRows } = await pool.query(
      'SELECT first_name, last_name, username FROM users WHERE id = $1',
      [row.owner_id]
    );
    const owner = ownerRows[0];
    const ownerName = owner ? `${owner.first_name} ${owner.last_name}`.trim() || owner.username : 'Bilinmiyor';

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=sozlesme_${row.id}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text(row.title.toUpperCase(), { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666').text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).text(`Durum: ${row.status}`, { align: 'center' });
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
    doc.moveDown(1);

    doc.fontSize(12).fillColor('#000').text('TARAFLAR', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).text(`1. Taraf (Sozlesme Sahibi): ${ownerName}`);
    if (row.counterparty_name) {
      doc.text(`2. Taraf: ${row.counterparty_name}${row.counterparty_role ? ' (' + row.counterparty_role + ')' : ''}`);
    }
    if (row.amount) {
      doc.text(`Tutar: ${row.amount}`);
    }
    doc.moveDown(1);

    doc.fontSize(12).fillColor('#000').text('SOZLESME ICERIGI', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).text(row.content || 'Icerik belirtilmemis.', { lineGap: 4 });
    doc.moveDown(2);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
    doc.moveDown(1);
    doc.fontSize(10).text('Imzalar:', { underline: true });
    doc.moveDown(1);
    doc.text(`${ownerName}`);
    doc.text('________________________');
    doc.moveDown(1);
    if (row.counterparty_name) {
      doc.text(`${row.counterparty_name}`);
      doc.text('________________________');
    }

    doc.end();
  } catch (err) {
    console.error('PDF error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

module.exports = router;
