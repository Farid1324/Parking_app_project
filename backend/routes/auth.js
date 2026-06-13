const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { first_name, last_name, email, password, user_type } = req.body;
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ message: 'All fields required' });
    }
    const [existing] = await db.execute('SELECT id FROM user WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ message: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const role = ['regular','student','staff','admin'].includes(user_type) ? user_type : 'regular';
    await db.execute(
      'INSERT INTO user (first_name, last_name, email, password_hash, user_type, status, created_at) VALUES (?,?,?,?,?,?,NOW())',
      [first_name, last_name, email, hash, role, 'active']
    );
    res.status(201).json({ message: 'Registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.execute('SELECT * FROM user WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
    const user = rows[0];
    if (user.status === 'inactive' || user.status === 'banned') {
      return res.status(403).json({ message: 'Account is not active' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.user_type },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({
      token,
      user: { id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.user_type }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
