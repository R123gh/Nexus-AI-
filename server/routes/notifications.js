'use strict';
const router = require('express').Router();
const db = require('../db');

router.get('/:user_id', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  return res.json({ notifications: db.getNotifications(parseInt(req.params.user_id), limit) });
});

router.post('/read/:notification_id', (req, res) => {
  const { user_id } = req.body || {};
  if (!user_id) return res.status(400).json({ error: 'User ID required' });
  db.markNotificationRead(parseInt(req.params.notification_id), parseInt(user_id));
  return res.json({ success: true });
});

router.post('/read-all/:user_id', (req, res) => {
  db.markAllRead(parseInt(req.params.user_id));
  return res.json({ success: true });
});

router.delete('/delete/:notification_id', (req, res) => {
  const user_id = parseInt(req.query.user_id);
  if (!user_id) return res.status(400).json({ error: 'User ID required' });
  db.deleteNotification(parseInt(req.params.notification_id), user_id);
  return res.json({ success: true });
});

router.post('/create', (req, res) => {
  const { user_id, title, message, type } = req.body || {};
  if (!user_id || !title || !message) return res.status(400).json({ error: 'Missing required fields' });
  db.addNotification(parseInt(user_id), title, message, type || 'info');
  return res.json({ success: true });
});

module.exports = router;
