/*
 * 2FAS Vault — /api/backup
 * -------------------------
 * GET  /api/backup       → returns the full 2fas backup JSON from Firebase.
 * POST /api/backup       → replaces the entire backup at /backup. The body
 *                          must be a valid 2fas-backup object containing a
 *                          `schemaVersion` field.
 *
 * Both routes require the X-API-Key header.
 */

'use strict';

const express = require('express');
const fb = require('../firebase.js');
const { requireApiKey } = require('./_auth.js');

const router = express.Router();

// Body parsing for this router only — keep payload caps generous (backups can
// grow with many services + group metadata).
router.use(express.json({ limit: '4mb' }));

router.get('/', requireApiKey, async (req, res, next) => {
  try {
    const data = await fb.getBackup();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireApiKey, async (req, res, next) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Body must be a JSON object.' });
    }
    if (typeof body.schemaVersion === 'undefined') {
      return res.status(400).json({ error: 'Backup is missing required field: schemaVersion.' });
    }
    const services = Array.isArray(body.services) ? body.services : [];
    await fb.setBackup(body);
    res.json({ ok: true, count: services.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
