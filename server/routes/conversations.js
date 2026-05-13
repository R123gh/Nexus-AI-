'use strict';
const router = require('express').Router();
const db = require('../db');

// GET /api/conversations/:user_id  — list all conversations
router.get('/:user_id', (req, res) => {
  try {
    const convs = db.getUserConversations(parseInt(req.params.user_id));
    return res.json(convs);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// GET /api/conversations/history/:session_id  — get full history for a session
router.get('/history/:session_id', (req, res) => {
  try {
    const history = db.getHistory(req.params.session_id);
    return res.json(history);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
