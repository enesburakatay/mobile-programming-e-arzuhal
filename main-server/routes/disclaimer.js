const express = require('express');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// GET /api/disclaimer/status
router.get('/status', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT disclaimer_accepted FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json({
      accepted: rows.length > 0 ? rows[0].disclaimer_accepted === true : false,
    });
  } catch (err) {
    console.error('Disclaimer status error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// POST /api/disclaimer/accept
router.post('/accept', async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET disclaimer_accepted = TRUE, updated_at = NOW() WHERE id = $1',
      [req.user.id]
    );
    res.status(204).send();
  } catch (err) {
    console.error('Disclaimer accept error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

module.exports = router;
