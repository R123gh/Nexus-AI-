'use strict';
const router = require('express').Router();
const db = require('../db');

router.post('/incoming', (req, res) => {
  const { user_id = 1, title = 'Incoming Webhook', message = 'Data received from external service.', type = 'info' } = req.body || {};
  db.addNotification(parseInt(user_id), title, message, type);
  return res.json({ success: true, received_at: Date.now(), status: 'Notification created' });
});

router.get('/status', (req, res) => {
  return res.json({
    service: 'NexusAI Webhook Engine',
    status: 'active',
    endpoints: { incoming: '/api/webhooks/incoming' },
  });
});

module.exports = router;
