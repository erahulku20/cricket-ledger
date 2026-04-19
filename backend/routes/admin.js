const express = require('express');
const router = express.Router();
const { signAdminToken, isAdminSecretValid } = require('../auth');

router.post('/unlock', (req, res) => {
  const { secret } = req.body;
  if (!secret) {
    return res.status(400).json({ error: 'Admin secret is required' });
  }

  if (!isAdminSecretValid(secret)) {
    return res.status(403).json({ error: 'Invalid admin secret' });
  }

  const token = signAdminToken();
  res.json({ token, message: 'Admin write access unlocked.' });
});

module.exports = router;
