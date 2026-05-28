/*
 * 2FAS Vault — Firebase Realtime Database client
 * -----------------------------------------------
 * Decodes APP2FAS_FIREBASE_CREDENTIALS_B64 (a base64-encoded service-account
 * JSON) and initialises firebase-admin against the Realtime Database whose
 * URL is contained in the same JSON (`databaseURL`).
 *
 * Security:
 *   - The decoded credential object is held only inside this module's closure
 *     and is never logged, returned, or stringified.
 *   - In dev mode, when no credentials are available, an in-memory fallback
 *     store is used so the API still serves something useful for local UI work.
 *     The fallback is OFF by default in production.
 *
 * Data layout in Realtime Database:
 *   /backup           ← the full 2fas-backup JSON object
 */

'use strict';

let admin = null;
try {
  // Optional dependency — only fail when actually used in real-Firebase mode.
  // eslint-disable-next-line global-require
  admin = require('firebase-admin');
} catch (_) {
  admin = null;
}

let _initialized = false;
let _useMemory = false;
let _memoryBackup = { schemaVersion: 3, services: [], groups: [] };

function _safeParseCreds() {
  const b64 = process.env.APP2FAS_FIREBASE_CREDENTIALS_B64;
  if (!b64) return null;
  let json;
  try {
    json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch (e) {
    // Don't echo the raw payload back — only the failure mode.
    throw new Error('APP2FAS_FIREBASE_CREDENTIALS_B64 is not valid base64-encoded JSON.');
  }
  if (!json || typeof json !== 'object') {
    throw new Error('APP2FAS_FIREBASE_CREDENTIALS_B64 did not decode to an object.');
  }
  // Validate the minimum required fields without quoting the values.
  const required = ['project_id', 'databaseURL'];
  for (const k of required) {
    if (!json[k]) {
      throw new Error('APP2FAS_FIREBASE_CREDENTIALS_B64: missing required field "' + k + '".');
    }
  }
  return json;
}

function _init() {
  if (_initialized) return;
  _initialized = true;

  let creds;
  try {
    creds = _safeParseCreds();
  } catch (e) {
    // Surface the message but never the credentials.
    throw e;
  }

  if (!creds) {
    if (process.env.APP2FAS_ALLOW_MEMORY_FALLBACK === '1') {
      _useMemory = true;
      // eslint-disable-next-line no-console
      console.warn('[firebase] No APP2FAS_FIREBASE_CREDENTIALS_B64 — using in-memory fallback (APP2FAS_ALLOW_MEMORY_FALLBACK=1).');
      return;
    }
    throw new Error('Firebase not configured: APP2FAS_FIREBASE_CREDENTIALS_B64 is not set.');
  }

  if (!admin) {
    throw new Error('firebase-admin module is not installed; run `npm install` first.');
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(creds),
      databaseURL: creds.databaseURL,
    });
  }
}

async function getServices() {
  _init();
  if (_useMemory) {
    return Array.isArray(_memoryBackup.services) ? _memoryBackup.services : [];
  }
  const snap = await admin.database().ref('/backup/services').once('value');
  const v = snap.val();
  return Array.isArray(v) ? v : [];
}

async function getBackup() {
  _init();
  if (_useMemory) {
    return _memoryBackup;
  }
  const snap = await admin.database().ref('/backup').once('value');
  return snap.val() || { schemaVersion: 3, services: [], groups: [] };
}

async function setBackup(backupJson) {
  _init();
  if (!backupJson || typeof backupJson !== 'object') {
    throw new TypeError('setBackup: backup payload must be an object.');
  }
  if (_useMemory) {
    _memoryBackup = backupJson;
    return;
  }
  await admin.database().ref('/backup').set(backupJson);
}

/**
 * For unit tests only — load a backup directly into the in-memory fallback,
 * bypassing Firebase. Has no effect in real-Firebase mode.
 */
function _seedMemory(backupJson) {
  if (_useMemory && backupJson) _memoryBackup = backupJson;
}

module.exports = {
  getServices,
  getBackup,
  setBackup,
  _seedMemory,
};
