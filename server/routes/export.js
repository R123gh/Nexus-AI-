'use strict';
const router = require('express').Router();
const db = require('../db');

router.get('/all/:user_id', (req, res) => {
  try {
    const user_id = parseInt(req.params.user_id);
    const profile = db.getUserProfile(user_id);
    const conversations = db.getUserConversations(user_id);
    const stats = db.getUsageStats(user_id);

    const exportData = {
      export_date: new Date().toISOString(),
      user_profile: profile,
      conversations,
      usage_analytics: stats,
    };

    res.setHeader('Content-Disposition', `attachment; filename="nexusai_export_${user_id}_${Date.now()}.json"`);
    res.setHeader('Content-Type', 'application/json');
    return res.send(JSON.stringify(exportData, null, 2));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
