/*
 * 2FAS Vault — /api/secrets
 * --------------------------
 * GET /api/secrets?q=<query>
 *
 * Returns matched 2fas service entries with their METADATA only — the actual
 * secret value is intentionally STRIPPED from the response. This endpoint is
 * for UI views that need to enumerate services without ever exposing
 * cryptographic material to the client.
 */

'use strict';

const express = require('express');
const { resolveServices } = require('../tier-resolver.js');
const fb = require('../firebase.js');
const { requireApiKey } = require('./_auth.js');

const router = express.Router();

router.get('/', requireApiKey, async (req, res, next) => {
  try {
    const q = (req.query.q || '').toString();
    if (!q) {
      return res.status(400).json({ error: 'Missing required query param: q' });
    }
    const allServices = await fb.getServices();
    const matches = resolveServices(q, allServices);

    const results = matches.map((svc) => ({
      name: svc.name,
      label: svc.otp ? svc.otp.label : null,
      account: svc.otp ? svc.otp.account : null,
      issuer: svc.otp ? svc.otp.issuer : null,
      tokenType: svc.otp ? svc.otp.tokenType : null,
      algorithm: svc.otp ? svc.otp.algorithm : null,
      digits: svc.otp ? svc.otp.digits : null,
      period: svc.otp ? svc.otp.period : null,
      counter: svc.otp ? svc.otp.counter : null,
      groupId: svc.groupId || null,
      tier: svc.tier,
    }));

    res.json({ results: results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
