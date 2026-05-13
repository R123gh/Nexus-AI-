'use strict';
const router = require('express').Router();
const db = require('../db');
const fetch = require('node-fetch');

// GET /api/vault/keys/:user_id
router.get('/keys/:user_id', (req, res) => {
  const keys = db.getApiKeys(parseInt(req.params.user_id));
  const masked = Object.fromEntries(
    Object.entries(keys).map(([k, v]) => [k, v.length > 8 ? `${v.slice(0,4)}...${v.slice(-4)}` : '****'])
  );
  return res.json({ keys: masked });
});

// POST /api/vault/keys/save
router.post('/keys/save', (req, res) => {
  const { user_id, service, api_key } = req.body || {};
  if (!user_id || !service || !api_key)
    return res.status(400).json({ error: 'Missing required fields' });
  db.saveApiKey(parseInt(user_id), service, api_key);
  return res.json({ success: true });
});

// POST /api/vault/keys/validate
router.post('/keys/validate', async (req, res) => {
  const { service, api_key } = req.body || {};
  try {
    if (service === 'groq') {
      const r = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${api_key}` }, signal: AbortSignal.timeout(5000),
      });
      return res.json({ valid: r.status === 200 });
    }
    return res.status(400).json({ error: 'Unsupported service' });
  } catch (e) {
    return res.json({ valid: false, error: e.message });
  }
});

// DELETE /api/vault/keys/delete
router.delete('/keys/delete', (req, res) => {
  const { user_id, service } = req.body || {};
  if (!user_id || !service) return res.status(400).json({ error: 'Missing required fields' });
  db.deleteApiKey(parseInt(user_id), service);
  return res.json({ success: true });
});

module.exports = router;
