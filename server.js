/*
 * 2FAS Vault — Express entry point
 * ---------------------------------
 * The server is intentionally thin:
 *   - serves /public statically
 *   - mounts /api/{otp,secrets,backup}
 *   - performs no session / cookie / auth handling: tinyauth (or any
 *     reverse-proxy auth) is expected to sit in front of this app.
 *
 * Configuration via environment variables (see .env.example):
 *   APP2FAS_PORT                          (default 3000)
 *   APP2FAS_API_SECRET                    (required, validated per request)
 *   APP2FAS_FIREBASE_CREDENTIALS_B64      (required in production)
 *   APP2FAS_ALLOW_MEMORY_FALLBACK=1       (dev only — runs without Firebase)
 *
 * Per the project constraints, NEVER:
 *   - read or rely on `crypto.subtle` for any logic
 *   - log decoded Firebase credentials
 *   - return secret values in /api/secrets responses
 */

'use strict';

// Best-effort .env loader — keep the dependency tree slim by parsing manually
// so we don't pull in `dotenv`. Ignored if the file is missing.
(function loadDotEnvIfPresent() {
  const fs = require('fs');
  const path = require('path');
  const candidates = [
    path.resolve(__dirname, '.env'),
    path.resolve(process.cwd(), '.env'),
  ];
  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      const txt = fs.readFileSync(p, 'utf8');
      txt.split(/\r?\n/).forEach((rawLine) => {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) return;
        const eq = line.indexOf('=');
        if (eq === -1) return;
        const k = line.slice(0, eq).trim();
        let v = line.slice(eq + 1).trim();
        // strip surrounding quotes
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        if (!(k in process.env)) process.env[k] = v;
      });
      break;
    } catch (_) { /* ignore */ }
  }
}());

const path = require('path');
const express = require('express');

const otpRoute = require('./src/routes/otp.js');
const secretsRoute = require('./src/routes/secrets.js');
const backupRoute = require('./src/routes/backup.js');

const PORT = parseInt(process.env.APP2FAS_PORT, 10) || 3000;
const app = express();

// Static frontend (SPA + bundled OTPAuth UMD).
app.use(express.static(path.join(__dirname, 'public')));

// API mounts.
app.use('/api/otp', otpRoute);
app.use('/api/secrets', secretsRoute);
app.use('/api/backup', backupRoute);

// Health check (no auth).
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: '2fas-vault', time: Date.now() });
});

// JSON 404 for /api/* misses.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

// SPA fallback — let the browser handle hash routing.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralised error handler. Never leak stack traces in production.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const isProd = process.env.NODE_ENV === 'production';
  // eslint-disable-next-line no-console
  console.error('[2fas-vault]', err && err.message ? err.message : err);
  res.status(err && err.status ? err.status : 500).json({
    error: isProd ? 'Internal server error.' : (err && err.message) || 'Internal server error.',
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log('2FAS Vault listening on http://localhost:' + PORT);
  });
}

module.exports = app;
