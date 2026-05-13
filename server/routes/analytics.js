'use strict';
const router = require('express').Router();
const db = require('../db');

router.get('/stats/:user_id', (req, res) => {
  try {
    return res.json(db.getUsageStats(parseInt(req.params.user_id)));
  } catch (e) { return res.status(500).json({ error: e.message }); }
});

router.get('/logs/:user_id', (req, res) => {
  // For now returns usage stats — full log support via SQLite
  try {
    return res.json({ logs: [] });
  } catch (e) { return res.status(500).json({ error: e.message }); }
});

module.exports = router;
