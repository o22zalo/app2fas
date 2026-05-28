/*
 * 2FAS Vault — /api/otp
 * ----------------------
 * GET /api/otp?q=<query>&type=<totp|hotp|steam>&offset=<0|30>
 *
 * Returns matched 2fas service entries with their `current` and `next` OTP
 * values. Secrets are NEVER returned. The matching is performed by
 * src/tier-resolver.js; per-entry OTP generation is delegated to
 * src/otp-engine.js.
 */

'use strict';

const express = require('express');
const { resolveServices } = require('../tier-resolver.js');
const otp = require('../otp-engine.js');
const fb = require('../firebase.js');
const { requireApiKey } = require('./_auth.js');

const router = express.Router();

router.get('/', requireApiKey, async (req, res, next) => {
  try {
    const q = (req.query.q || '').toString();
    if (!q) {
      return res.status(400).json({ error: 'Missing required query param: q' });
    }
    const forceType = req.query.type ? String(req.query.type).toUpperCase() : null;
    if (forceType && !['TOTP', 'HOTP', 'STEAM'].includes(forceType)) {
      return res.status(400).json({ error: 'Invalid type param (allowed: totp, hotp, steam).' });
    }
    const offsetSec = Number(req.query.offset || 0);
    const allServices = await fb.getServices();
    const matches = resolveServices(q, allServices);

    const results = matches.map((svc) => {
      const tokenType = forceType || (svc.otp && svc.otp.tokenType ? svc.otp.tokenType.toUpperCase() : 'TOTP');
      const cn = otp.getCurrentAndNext({
        secret: svc.secret,
        otp: Object.assign({}, svc.otp, { tokenType: tokenType }),
      });
      // If caller asked for the "next" period (offset === period), shift the
      // returned `current` to match what the UI will display in 30s.
      let current = cn.current;
      let next = cn.next;
      const period = (svc.otp && svc.otp.period) || 30;
      if (offsetSec && offsetSec >= period && tokenType !== 'HOTP') {
        current = cn.next;
        // Recompute the actual following code.
        next = otp.resolveOTP(svc, { slot: 'next', timestamp: Date.now() + offsetSec * 1000 });
      }
      return {
        name: svc.name,
        label: svc.otp ? svc.otp.label : null,
        issuer: svc.otp ? svc.otp.issuer : null,
        tokenType: tokenType,
        algorithm: svc.otp ? svc.otp.algorithm : 'SHA1',
        digits: svc.otp ? svc.otp.digits : 6,
        period: tokenType === 'HOTP' ? null : period,
        counter: tokenType === 'HOTP' ? (svc.otp && svc.otp.counter) : null,
        current: current,
        next: next,
        remainingSeconds: cn.remainingSeconds,
        tier: svc.tier,
      };
    });

    res.json({ results: results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
