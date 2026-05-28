/*
 * 2FAS Vault — Constant-time API key middleware
 * ----------------------------------------------
 * Validates the X-API-Key request header against APP2FAS_API_SECRET using a
 * pure-XOR equality loop. No native crypto is used.
 *
 * IMPORTANT:
 *   - We MUST NOT use `===` on full strings (early-exit timing leak).
 *   - We MUST NOT use crypto.timingSafeEqual.
 */

'use strict';

function constantTimeEqual(a, b) {
  // Compare strings byte-by-byte using a fixed-length XOR fold so the running
  // time depends only on max(len(a), len(b)), never on where a mismatch occurs.
  const aStr = a == null ? '' : String(a);
  const bStr = b == null ? '' : String(b);
  const n = Math.max(aStr.length, bStr.length);
  let diff = aStr.length ^ bStr.length; // length-mismatch bit
  for (let i = 0; i < n; i += 1) {
    const ac = i < aStr.length ? aStr.charCodeAt(i) : 0;
    const bc = i < bStr.length ? bStr.charCodeAt(i) : 0;
    diff |= (ac ^ bc);
  }
  return diff === 0;
}

function requireApiKey(req, res, next) {
  const expected = process.env.APP2FAS_API_SECRET || '';
  if (!expected) {
    return res.status(500).json({ error: 'Server misconfigured: APP2FAS_API_SECRET not set.' });
  }
  const provided = req.header('X-API-Key') || '';
  if (!constantTimeEqual(provided, expected)) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
}

module.exports = { requireApiKey, constantTimeEqual };
