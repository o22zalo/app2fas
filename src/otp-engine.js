/*
 * 2FAS Vault — OTP Engine (isomorphic: Node.js + Browser)
 * --------------------------------------------------------
 * Generates TOTP / HOTP / STEAM codes using the pure-JS HMAC implementation
 * shipped inside `otpauth.umd.min.js` (OTPAuth 9.1.1).
 *
 * HARD CONSTRAINTS (locked decisions):
 *   - NEVER call crypto.subtle, SubtleCrypto, window.crypto.getRandomValues,
 *     or any Web Crypto API.
 *   - NEVER require any native crypto module.
 *   - The OTPAuth library (which contains the HMAC engine — class `Oe` in the
 *     minified bundle) is the SOLE source of HMAC computation.
 *
 * In Node.js: this file loads `public/otpauth.umd.min.js` once at startup,
 *   executes it in an isolated function scope, and captures the OTPAuth
 *   module object via the `exports` argument. No native crypto is used.
 *
 * In Browser: the script tag <script src="otpauth.umd.min.js"></script>
 *   exposes `globalThis.OTPAuth`. This file detects that and wires its
 *   public functions onto `window.OTPEngine`.
 *
 * Public API (identical in both environments):
 *   - generateTOTP({ secret, algorithm, digits, period, timestamp })  -> string
 *   - generateHOTP({ secret, algorithm, digits, counter })            -> string
 *   - generateSTEAM({ secret, period, timestamp })                    -> string (5 chars)
 *   - getCurrentAndNext(serviceEntry) -> { current, next, remainingSeconds, period }
 *   - resolveOTP(serviceEntry, options) -> string
 */

(function (root, factory) {
  'use strict';

  // -------------------------------------------------------------------------
  // OTPAuth loader (no native crypto on either side)
  // -------------------------------------------------------------------------
  function loadOTPAuth() {
    // Browser: rely on the globally loaded OTPAuth (script tag).
    if (typeof window !== 'undefined' && window.OTPAuth) {
      return window.OTPAuth;
    }
    if (typeof globalThis !== 'undefined' && globalThis.OTPAuth) {
      return globalThis.OTPAuth;
    }

    // Node.js: locate and execute the bundled UMD file in an isolated scope.
    // We DO NOT use the `vm` module — a plain Function() invocation is enough,
    // because the UMD wrapper checks `typeof exports == "object"` first and
    // populates the exports object we hand it.
    var fs = require('fs');
    var path = require('path');

    // Try a couple of candidate locations so the module works whether it is
    // imported from `2fas-vault/server.js` or from a unit test elsewhere.
    var candidates = [
      path.resolve(__dirname, '..', 'public', 'otpauth.umd.min.js'),
      path.resolve(__dirname, '..', '..', 'docs', 'otpauth.umd.min.js'),
      path.resolve(process.cwd(), 'public', 'otpauth.umd.min.js'),
    ];

    var src = null;
    for (var i = 0; i < candidates.length; i += 1) {
      try {
        if (fs.existsSync(candidates[i])) {
          src = fs.readFileSync(candidates[i], 'utf8');
          break;
        }
      } catch (_) { /* keep trying */ }
    }
    if (!src) {
      throw new Error('OTP Engine: could not locate otpauth.umd.min.js. ' +
        'Expected at 2fas-vault/public/otpauth.umd.min.js');
    }

    // Strip the trailing helper that references a non-existent global OTPAuth
    // outside the IIFE; keep only the UMD module body.
    var endMarker = '// END: OTPAuth Library';
    var endIdx = src.indexOf(endMarker);
    if (endIdx !== -1) {
      // Drop everything after the END comment line, then truncate.
      src = src.slice(0, src.indexOf('\n', endIdx) + 1);
    }

    var moduleObj = { exports: {} };
    var fakeWindow = {};
    // The UMD checks `typeof exports == "object" && typeof module != "undefined"`,
    // so it will take the CommonJS branch and populate `exports` directly.
    // eslint-disable-next-line no-new-func
    var runner = new Function(
      'exports', 'module', 'globalThis', 'window', 'self',
      src + '\nreturn exports;'
    );
    var exportsObj = runner(moduleObj.exports, moduleObj, fakeWindow, fakeWindow, fakeWindow);
    if (!exportsObj || !exportsObj.TOTP || !exportsObj.HOTP || !exportsObj.Secret) {
      throw new Error('OTP Engine: failed to load OTPAuth — TOTP/HOTP/Secret not exported.');
    }
    return exportsObj;
  }

  var OTPAuth;
  try {
    OTPAuth = loadOTPAuth();
  } catch (err) {
    // In some sandboxed environments we might fail at module-evaluation time;
    // surface the error lazily so unit tests can still import this module.
    OTPAuth = null;
    if (typeof console !== 'undefined') {
      console.error('[otp-engine] OTPAuth load failed:', err && err.message);
    }
  }

  // The factory below uses OTPAuth so we capture it here.
  var lib = factory(OTPAuth);

  // -------------------------------------------------------------------------
  // Export — CommonJS, AMD, or browser global
  // -------------------------------------------------------------------------
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = lib;
  } else if (typeof define === 'function' && define.amd) {
    define([], function () { return lib; });
  } else {
    root.OTPEngine = lib;
  }
}(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function (OTPAuth) {
  'use strict';

  // STEAM token alphabet: 26 chars (per Valve's algorithm).
  // Note: the project spec mentions "5-char alphanumeric alphabet" for STEAM,
  // and the alphabet itself is 26 characters long. STEAM codes are 5 chars
  // sampled from this alphabet.
  var STEAM_ALPHABET = '23456789BCDFGHJKMNPQRTVWXY';

  function requireLib() {
    if (!OTPAuth) {
      throw new Error('OTP Engine not initialized: OTPAuth library is unavailable.');
    }
    return OTPAuth;
  }

  function normalizeSecret(secret) {
    if (typeof secret !== 'string' || secret.length === 0) {
      throw new TypeError('OTP secret must be a non-empty Base32 string.');
    }
    // Strip whitespace and pad characters; Base32 is case-insensitive and the
    // OTPAuth library accepts both upper and lower forms but strips spaces.
    return secret.replace(/\s+/g, '').toUpperCase();
  }

  function normalizeAlgorithm(alg) {
    var a = String(alg || 'SHA1').toUpperCase();
    // OTPAuth expects "SHA1", "SHA256", "SHA512" without dashes.
    if (a === 'SHA-1') a = 'SHA1';
    if (a === 'SHA-256') a = 'SHA256';
    if (a === 'SHA-512') a = 'SHA512';
    return a;
  }

  /**
   * Generate a TOTP code.
   * @param {Object} opts
   * @param {string} opts.secret      - Base32-encoded shared secret.
   * @param {string} [opts.algorithm] - SHA1 (default) | SHA256 | SHA512.
   * @param {number} [opts.digits=6]
   * @param {number} [opts.period=30]
   * @param {number} [opts.timestamp] - ms; defaults to Date.now().
   * @returns {string}
   */
  function generateTOTP(opts) {
    var O = requireLib();
    opts = opts || {};
    var secret = normalizeSecret(opts.secret);
    var algorithm = normalizeAlgorithm(opts.algorithm);
    var digits = opts.digits != null ? opts.digits : 6;
    var period = opts.period != null ? opts.period : 30;
    var timestamp = opts.timestamp != null ? opts.timestamp : Date.now();

    var totp = new O.TOTP({
      issuer: '',
      label: '',
      secret: secret,
      algorithm: algorithm,
      digits: digits,
      period: period,
    });
    return totp.generate({ timestamp: timestamp });
  }

  /**
   * Generate an HOTP code.
   * @param {Object} opts
   * @param {string} opts.secret
   * @param {string} [opts.algorithm]
   * @param {number} [opts.digits=6]
   * @param {number} [opts.counter=0]
   * @returns {string}
   */
  function generateHOTP(opts) {
    var O = requireLib();
    opts = opts || {};
    var secret = normalizeSecret(opts.secret);
    var algorithm = normalizeAlgorithm(opts.algorithm);
    var digits = opts.digits != null ? opts.digits : 6;
    var counter = opts.counter != null ? opts.counter : 0;

    var hotp = new O.HOTP({
      issuer: '',
      label: '',
      secret: secret,
      algorithm: algorithm,
      digits: digits,
      counter: counter,
    });
    return hotp.generate({ counter: counter });
  }

  /**
   * Generate a Steam Guard code.
   *
   * STEAM derives bytes from a SHA1-HMAC-based TOTP step (period default 30s),
   * but instead of the standard "%10^digits" decimal mapping, it folds a 32-bit
   * truncated value through a 26-character alphabet to produce a 5-char code.
   *
   * Reference: https://github.com/winauth/winauth (SteamAuthenticator) and
   * Valve's mobile authenticator.
   *
   * @param {Object} opts
   * @param {string} opts.secret      - Base32-encoded shared secret.
   * @param {number} [opts.period=30]
   * @param {number} [opts.timestamp] - ms; defaults to Date.now().
   * @returns {string} 5-character Steam Guard code.
   */
  function generateSTEAM(opts) {
    var O = requireLib();
    opts = opts || {};
    var secret = normalizeSecret(opts.secret);
    var period = opts.period != null ? opts.period : 30;
    var timestamp = opts.timestamp != null ? opts.timestamp : Date.now();

    // Step 1: compute the standard SHA1 HMAC-OTP truncation into a 31-bit int.
    // We piggyback on OTPAuth's TOTP with a large `digits` and parse manually,
    // because TOTP truncation is exactly the integer we need.
    //
    // To avoid relying on internal undocumented APIs, we ask OTPAuth to give us
    // an 8-digit TOTP and then derive the underlying 31-bit truncated integer
    // by re-walking the HMAC. But OTPAuth doesn't expose the raw HMAC bytes
    // publicly. Instead, we construct an HOTP at counter = floor(ts/1000/period),
    // request a 10-digit token, then convert the decimal value back to its
    // 31-bit form. Every TOTP/HOTP digits N ≤ 10 is just `value % 10^N` of the
    // same 31-bit truncation, so digits=10 yields the full 31-bit integer.
    var counter = Math.floor(timestamp / 1000 / period);
    var hotp = new O.HOTP({
      issuer: '', label: '',
      secret: secret,
      algorithm: 'SHA1',
      digits: 10,
      counter: counter,
    });
    var fullStr = hotp.generate({ counter: counter });
    // `fullStr` is the decimal representation, possibly with leading zeros, of
    // a 31-bit unsigned integer — exactly the truncated HMAC value.
    // Parse it back to a number (safe: 31-bit ≤ 2^31-1 < Number.MAX_SAFE_INTEGER).
    var fullCode = parseInt(fullStr, 10);
    if (!isFinite(fullCode) || fullCode < 0) {
      throw new Error('STEAM: failed to derive truncated HMAC value.');
    }

    // Step 2: fold through the 26-char alphabet, 5 iterations.
    var out = '';
    for (var i = 0; i < 5; i += 1) {
      out += STEAM_ALPHABET.charAt(fullCode % STEAM_ALPHABET.length);
      fullCode = Math.floor(fullCode / STEAM_ALPHABET.length);
    }
    return out;
  }

  /**
   * Compute the current and next OTP codes for a 2fas service entry.
   *
   * Always derives `remainingSeconds` as
   *   period - (Math.floor(Date.now()/1000) % period)
   * per the project spec.
   *
   * For HOTP entries, "next" is the code for counter+1 and `remainingSeconds`
   * is reported as 0 (not time-driven).
   *
   * @param {Object} entry  A 2fas service object: { secret, otp: {...} }.
   * @returns {{ current: string, next: string, remainingSeconds: number, period: number }}
   */
  function getCurrentAndNext(entry) {
    if (!entry || !entry.otp) throw new TypeError('Invalid service entry.');
    var otp = entry.otp;
    var tokenType = (otp.tokenType || 'TOTP').toUpperCase();
    var period = otp.period != null ? otp.period : 30;
    var algorithm = otp.algorithm || 'SHA1';
    var digits = otp.digits != null ? otp.digits : 6;
    var nowMs = Date.now();
    var nowSec = Math.floor(nowMs / 1000);
    var remainingSeconds = period - (nowSec % period);

    if (tokenType === 'HOTP') {
      var counter = otp.counter != null ? otp.counter : 0;
      var current = generateHOTP({
        secret: entry.secret, algorithm: algorithm, digits: digits, counter: counter,
      });
      var next = generateHOTP({
        secret: entry.secret, algorithm: algorithm, digits: digits, counter: counter + 1,
      });
      return { current: current, next: next, remainingSeconds: 0, period: 0 };
    }

    if (tokenType === 'STEAM') {
      var sCur = generateSTEAM({ secret: entry.secret, period: period, timestamp: nowMs });
      var sNext = generateSTEAM({ secret: entry.secret, period: period, timestamp: nowMs + period * 1000 });
      return { current: sCur, next: sNext, remainingSeconds: remainingSeconds, period: period };
    }

    // Default: TOTP
    var tCur = generateTOTP({
      secret: entry.secret, algorithm: algorithm, digits: digits,
      period: period, timestamp: nowMs,
    });
    var tNext = generateTOTP({
      secret: entry.secret, algorithm: algorithm, digits: digits,
      period: period, timestamp: nowMs + period * 1000,
    });
    return { current: tCur, next: tNext, remainingSeconds: remainingSeconds, period: period };
  }

  /**
   * Resolve a single OTP value for a service entry, dispatching by tokenType.
   *
   * @param {Object} entry  A 2fas service object.
   * @param {Object} [options]
   * @param {'current'|'next'} [options.slot='current']  Which time slot to return.
   * @param {number} [options.timestamp]                 ms override (TOTP/STEAM only).
   * @param {number} [options.counter]                   counter override (HOTP only).
   * @param {string} [options.type]                      Force a token type (TOTP|HOTP|STEAM).
   * @returns {string}
   */
  function resolveOTP(entry, options) {
    if (!entry || !entry.otp) throw new TypeError('Invalid service entry.');
    options = options || {};
    var slot = options.slot === 'next' ? 'next' : 'current';
    var otp = entry.otp;
    var type = (options.type || otp.tokenType || 'TOTP').toUpperCase();
    var period = otp.period != null ? otp.period : 30;
    var algorithm = otp.algorithm || 'SHA1';
    var digits = otp.digits != null ? otp.digits : 6;
    var ts = options.timestamp != null ? options.timestamp : Date.now();

    if (type === 'HOTP') {
      var c = options.counter != null ? options.counter : (otp.counter != null ? otp.counter : 0);
      if (slot === 'next') c += 1;
      return generateHOTP({
        secret: entry.secret, algorithm: algorithm, digits: digits, counter: c,
      });
    }

    if (type === 'STEAM') {
      var stamp = ts + (slot === 'next' ? period * 1000 : 0);
      return generateSTEAM({ secret: entry.secret, period: period, timestamp: stamp });
    }

    var stampT = ts + (slot === 'next' ? period * 1000 : 0);
    return generateTOTP({
      secret: entry.secret, algorithm: algorithm, digits: digits,
      period: period, timestamp: stampT,
    });
  }

  return {
    STEAM_ALPHABET: STEAM_ALPHABET,
    generateTOTP: generateTOTP,
    generateHOTP: generateHOTP,
    generateSTEAM: generateSTEAM,
    getCurrentAndNext: getCurrentAndNext,
    resolveOTP: resolveOTP,
  };
}));
