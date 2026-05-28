/*
 * 2FAS Vault — Tier Resolver
 * ---------------------------
 * Multi-tier label/account/email matcher that accepts a single query string
 * and returns 2fas service entries ranked by how strictly they match.
 *
 * Tiers (strictest → loosest):
 *   T1: exact match on `otp.label` OR `otp.account`
 *   T2: same email local-part (text before @), any domain          [@-only]
 *   T3: local-part with all dots stripped, original domain          [@-only]
 *   T4: local-part only (text before @)                             [@-only]
 *   T5: local-part with all dots stripped (any domain)              [@-only]
 *   T6: plain substring match on `name` (case-insensitive fallback)
 *
 * Ordering is preserved: T1 services come first, then T2, …, T6. Within a
 * tier, services keep their incoming order. Each service appears at most once,
 * and is annotated with a non-enumerable `tier` field so callers can show how
 * the match was made without polluting JSON serialization (we expose it via
 * a thin wrapper object instead — see `resolveServices` return type).
 */

'use strict';

function lc(v) { return (v == null ? '' : String(v)).toLowerCase(); }

function splitEmail(query) {
  // Returns { local, domain } with lowercase normalisation, or null if no `@`.
  if (!query || query.indexOf('@') === -1) return null;
  var at = query.indexOf('@');
  var local = query.slice(0, at);
  var domain = query.slice(at + 1);
  return { local: local, domain: domain };
}

function emailParts(value) {
  // For a stored label/account that may itself contain `@`.
  if (!value || value.indexOf('@') === -1) return null;
  var at = value.indexOf('@');
  return { local: value.slice(0, at), domain: value.slice(at + 1) };
}

function stripDots(s) { return String(s || '').split('.').join(''); }

/**
 * Resolve a query against an array of 2fas service objects.
 *
 * @param {string}   query        The user-entered query (label / email / name).
 * @param {Object[]} allServices  The full backup `services` array.
 * @returns {Array<Object & {tier:number, _matchedField:string}>}
 *          Each entry is the original service object decorated with a `tier`
 *          number (1..6) and `_matchedField` string. The original object is
 *          NOT mutated — a shallow copy is returned.
 */
function resolveServices(query, allServices) {
  if (!Array.isArray(allServices)) return [];
  var q = (query == null ? '' : String(query)).trim();
  if (q === '') return [];

  var qLower = q.toLowerCase();
  var qEmail = splitEmail(qLower);

  var seen = new Set(); // ensures no duplicates across tiers
  var results = [];     // ordered list of decorated service objects

  function pushIfNew(svc, tier, matchedField) {
    if (!svc) return;
    if (seen.has(svc)) return;
    seen.add(svc);
    var copy = Object.assign({}, svc);
    copy.tier = tier;
    copy._matchedField = matchedField;
    results.push(copy);
  }

  // ---------- T1: exact label OR account match (case-insensitive) ----------
  for (var i = 0; i < allServices.length; i += 1) {
    var s = allServices[i];
    if (!s || !s.otp) continue;
    var label = lc(s.otp.label);
    var account = lc(s.otp.account);
    if (label === qLower) {
      pushIfNew(s, 1, 'label');
    } else if (account === qLower) {
      pushIfNew(s, 1, 'account');
    }
  }

  // T2-T4 require an `@` in the query; T5 is allowed to fire even without one
  // because the test case "abc01" must reach "abc.01@gmail.com" at T5.
  if (qEmail) {
    var qLocal = qEmail.local;
    var qDomain = qEmail.domain;
    var qLocalNoDots = stripDots(qLocal);

    // ---------- T2: same local-part, any domain ----------
    for (var i2 = 0; i2 < allServices.length; i2 += 1) {
      var s2 = allServices[i2];
      if (!s2 || !s2.otp) continue;
      var lblP = emailParts(lc(s2.otp.label));
      var accP = emailParts(lc(s2.otp.account));
      if ((lblP && lblP.local === qLocal) || (accP && accP.local === qLocal)) {
        pushIfNew(s2, 2, lblP && lblP.local === qLocal ? 'label' : 'account');
      }
    }

    // ---------- T3: local-part with dots stripped, original domain ----------
    for (var i3 = 0; i3 < allServices.length; i3 += 1) {
      var s3 = allServices[i3];
      if (!s3 || !s3.otp) continue;
      var lblP3 = emailParts(lc(s3.otp.label));
      var accP3 = emailParts(lc(s3.otp.account));
      var match3 = false; var via3 = '';
      if (lblP3 && stripDots(lblP3.local) === qLocalNoDots && lblP3.domain === qDomain) {
        match3 = true; via3 = 'label';
      } else if (accP3 && stripDots(accP3.local) === qLocalNoDots && accP3.domain === qDomain) {
        match3 = true; via3 = 'account';
      }
      if (match3) pushIfNew(s3, 3, via3);
    }

    // ---------- T4: local-part only (label/account stored WITHOUT @) ----------
    // i.e. the stored label is just "bob" and the user typed "bob@gmail.com".
    for (var i4 = 0; i4 < allServices.length; i4 += 1) {
      var s4 = allServices[i4];
      if (!s4 || !s4.otp) continue;
      var lbl4 = lc(s4.otp.label);
      var acc4 = lc(s4.otp.account);
      // Only count it as T4 if the stored value has no `@` and equals the local-part.
      if (lbl4 && lbl4.indexOf('@') === -1 && lbl4 === qLocal) {
        pushIfNew(s4, 4, 'label');
      } else if (acc4 && acc4.indexOf('@') === -1 && acc4 === qLocal) {
        pushIfNew(s4, 4, 'account');
      }
    }
  }

  // ---------- T5: local-part with all dots stripped, any domain ----------
  // Per the project's acceptance criteria, T5 must also fire when the query
  // does NOT contain `@` (e.g. "abc01" → "abc.01@gmail.com"). Spec text and
  // acceptance criteria conflict on this; we follow the test contract.
  {
    var qLocalForT5 = qEmail ? qEmail.local : qLower;
    var qNoDotsT5 = stripDots(qLocalForT5);
    if (qNoDotsT5) {
      for (var i5 = 0; i5 < allServices.length; i5 += 1) {
        var s5 = allServices[i5];
        if (!s5 || !s5.otp) continue;
        var lblP5 = emailParts(lc(s5.otp.label));
        var accP5 = emailParts(lc(s5.otp.account));
        var lblPlain = lc(s5.otp.label);
        var accPlain = lc(s5.otp.account);
        var match5 = false; var via5 = '';
        if (lblP5 && stripDots(lblP5.local) === qNoDotsT5) { match5 = true; via5 = 'label'; }
        else if (accP5 && stripDots(accP5.local) === qNoDotsT5) { match5 = true; via5 = 'account'; }
        else if (lblPlain && lblPlain.indexOf('@') === -1 && stripDots(lblPlain) === qNoDotsT5) { match5 = true; via5 = 'label'; }
        else if (accPlain && accPlain.indexOf('@') === -1 && stripDots(accPlain) === qNoDotsT5) { match5 = true; via5 = 'account'; }
        if (match5) pushIfNew(s5, 5, via5);
      }
    }
  }

  // ---------- T6: plain substring match on `name` (always evaluated) ----------
  for (var i6 = 0; i6 < allServices.length; i6 += 1) {
    var s6 = allServices[i6];
    if (!s6) continue;
    var name = lc(s6.name);
    if (name && name.indexOf(qLower) !== -1) {
      pushIfNew(s6, 6, 'name');
    }
  }

  return results;
}

module.exports = { resolveServices: resolveServices };
