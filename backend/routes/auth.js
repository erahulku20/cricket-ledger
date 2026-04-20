const express = require('express');
const router = express.Router();
const { requestLoginCode, requestSignupCode, verifyLoginCode, getUserById } = require('../auth');

router.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, role } = req.body;
    const { user, urlSafety } = await requestSignupCode({ name, email, phone, role });
    res.json({
      message: 'Verification code sent. Check your email or phone.',
      debugCode: urlSafety,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, phone } = req.body;
    const { user, urlSafety } = await requestLoginCode({ email, phone });
    res.json({
      message: 'Verification code sent. Check your email or phone.',
      debugCode: urlSafety,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/verify-code', (req, res) => {
  try {
    const { email, phone, code } = req.body;
    const { token, user } = verifyLoginCode({ email, phone, code });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/me', (req, res) => {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token missing' });
  }

  const token = authorization.split(' ')[1];
  try {
    const payload = require('jsonwebtoken').verify(token, process.env.AUTH_SECRET || 'please-change-this-secret');
    const user = getUserById(payload.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
