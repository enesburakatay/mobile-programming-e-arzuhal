const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Kullanıcı adı, e-posta ve şifre zorunludur.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Şifre en az 6 karakter olmalıdır.' });
    }

    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: 'Bu kullanıcı adı veya e-posta zaten kayıtlı.' });
    }

    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);

    await pool.query(
      `INSERT INTO users (id, username, email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, username, email, passwordHash, firstName || '', lastName || '']
    );

    const user = { id, username, email, firstName: firstName || '', lastName: lastName || '' };
    const accessToken = generateToken(user);

    res.status(201).json({ accessToken, userInfo: user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({ message: 'Kullanıcı adı/e-posta ve şifre zorunludur.' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [usernameOrEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre.' });
    }

    const user = rows[0];
    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre.' });
    }

    const userInfo = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    };

    const accessToken = generateToken(userInfo);
    res.json({ accessToken, userInfo });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

module.exports = router;
