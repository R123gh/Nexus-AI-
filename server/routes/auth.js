'use strict';
const router = require('express').Router();
const db = require('../db');

router.post('/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });
  const result = db.registerUser(username, password);
  if (result.success) return res.json({ success: true, user_id: result.user_id });
  return res.status(400).json({ error: result.error });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });
  const result = db.loginUser(username, password);
  if (result.success) return res.json(result);
  return res.status(401).json({ error: result.error });
});

router.get('/profile/:user_id', (req, res) => {
  const profile = db.getUserProfile(parseInt(req.params.user_id));
  if (profile) return res.json(profile);
  return res.status(404).json({ error: 'User not found' });
});

router.post('/profile/update', (req, res) => {
  const { user_id, avatar_url, bio, email } = req.body || {};
  if (!user_id) return res.status(400).json({ error: 'User ID required' });
  db.updateUserProfile(parseInt(user_id), { avatar_url, bio, email });
  return res.json({ success: true });
});

module.exports = router;
