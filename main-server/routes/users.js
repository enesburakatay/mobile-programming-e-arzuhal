const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// GET /api/users/lookup?tcKimlik=...
router.get('/lookup', async (req, res) => {
  try {
    const { tcKimlik } = req.query;

    if (!tcKimlik || tcKimlik.length !== 11) {
      return res.json({ found: false });
    }

    const { rows } = await pool.query(
      'SELECT id, first_name, last_name, username FROM users WHERE tc_kimlik = $1',
      [tcKimlik]
    );

    if (rows.length === 0) {
      return res.json({ found: false });
    }

    const user = rows[0];
    const displayName = `${user.first_name} ${user.last_name}`.trim() || user.username;

    res.json({
      found: true,
      userId: user.id,
      displayName,
      username: user.username,
    });
  } catch (err) {
    console.error('Lookup error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// PUT /api/users/me
router.put('/me', async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'E-posta zorunludur.' });
    }

    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, req.user.id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Bu e-posta adresi zaten kullanılıyor.' });
    }

    await pool.query(
      `UPDATE users SET first_name = $1, last_name = $2, email = $3, updated_at = NOW()
       WHERE id = $4`,
      [firstName || '', lastName || '', email, req.user.id]
    );

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// PUT /api/users/me/password
router.put('/me/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Mevcut ve yeni şifre zorunludur.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Yeni şifre en az 6 karakter olmalıdır.' });
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const user = rows[0];

    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(400).json({ message: 'Mevcut şifre yanlış.' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, req.user.id]
    );

    res.status(204).send();
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

module.exports = router;
