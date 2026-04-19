const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// GET /api/verification/status
router.get('/status', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT verified, verify_method, tc_kimlik FROM users WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    const user = rows[0];
    res.json({
      verified: user.verified === true,
      method: user.verify_method || null,
      tcKimlik: user.tc_kimlik || null,
    });
  } catch (err) {
    console.error('Verification status error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// POST /api/verification/identity
router.post('/identity', async (req, res) => {
  try {
    const { method, tcKimlik } = req.body;
    const verifyMethod = method || 'MANUAL';

    await pool.query(
      `UPDATE users SET
         verified = TRUE,
         verify_method = $1,
         tc_kimlik = COALESCE($2, tc_kimlik),
         updated_at = NOW()
       WHERE id = $3`,
      [verifyMethod, tcKimlik || null, req.user.id]
    );

    res.status(204).send();
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

module.exports = router;
