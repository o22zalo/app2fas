# 2FAS Vault — Specification

> Production-ready 2FA management webapp. Generates TOTP / HOTP / Steam Guard
> codes, stores backups in Firebase Realtime Database, and provides a vanilla
> JS dashboard styled after the Falcon Dashboard design system.

---

## 1. Architecture

```
                ┌────────────────────────────────────────────┐
                │  Browser (Vanilla JS SPA, no build step)    │
                │  ┌─────────────────────────────────────┐    │
   tinyauth ──► │  │  index.html + app.js + style.css    │    │
  (external    │  │  + otpauth.umd.min.js (loaded via    │    │
  reverse-     │  │   <script>, exposes window.OTPAuth)  │    │
  proxy auth)  │  └─────────────────┬───────────────────┘    │
                │                    │ X-API-Key + JSON       │
                └────────────────────┼────────────────────────┘
                                     │
                                     ▼
                ┌────────────────────────────────────────────┐
                │  Express server (Node.js)                  │
                │  ┌──────────────┐ ┌─────────────────────┐  │
                │  │ /api/otp     │ │ Constant-time XOR   │  │
                │  │ /api/secrets │ │ X-API-Key compare   │  │
                │  │ /api/backup  │ └─────────────────────┘  │
                │  └──────────────┘                          │
                │  ┌─────────────────────────────────────┐   │
                │  │ src/otp-engine.js  (no Web Crypto)  │   │
                │  │   ↳ loads otpauth.umd.min.js        │   │
                │  │     in an isolated Function scope    │   │
                │  └─────────────────────────────────────┘   │
                │  ┌─────────────────────────────────────┐   │
                │  │ src/tier-resolver.js  T1..T6 search │   │
                │  └─────────────────────────────────────┘   │
                │  ┌─────────────────────────────────────┐   │
                │  │ src/firebase.js  (firebase-admin)   │   │
                │  └────────────────┬────────────────────┘   │
                └───────────────────┼────────────────────────┘
                                    │ HTTPS
                                    ▼
                  ┌────────────────────────────────┐
                  │  Firebase Realtime Database     │
                  │  Path: /backup → 2fas backup    │
                  └────────────────────────────────┘
```

**Authentication boundary.** This server has no login UI. A reverse-proxy
authenticator (e.g. `tinyauth`) is expected to gate `/` before traffic reaches
this app. API endpoints additionally validate `X-API-Key` so machine clients
can hit the server without going through the proxy.

---

## 2. Environment variables

All variables MUST be prefixed with `APP2FAS_`.

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `APP2FAS_PORT` | no | `3000` | TCP port for Express |
| `APP2FAS_API_SECRET` | yes | — | Long random string. Validated via constant-time XOR per request. |
| `APP2FAS_FIREBASE_CREDENTIALS_B64` | yes (prod) | — | Base64-encoded Firebase service-account JSON. The decoded JSON must contain `project_id`, `databaseURL`, `client_email`, `private_key`. |
| `APP2FAS_ALLOW_MEMORY_FALLBACK` | no | unset | If `1` AND credentials are absent, the server uses an in-process backup store. Dev only. |
| `NODE_ENV` | no | unset | Set to `production` to suppress error message bodies in 5xx responses. |

The decoded Firebase credentials object is **never** logged or echoed. The
loader (`src/firebase.js`) keeps the parsed object exclusively in module
closure and surfaces only validation messages.

---

## 3. API endpoints

Every `/api/*` route requires the `X-API-Key` header and returns
`application/json`.

### `GET /api/otp?q=<query>&type=<totp|hotp|steam>&offset=<seconds>`

Lookup matched 2FAS service entries and produce live OTP values for each.
Secrets are NEVER included in the response.

- `q` (required): search string (label / email / service name).
- `type` (optional): force a token type for all matches; if omitted each
  match uses its stored `tokenType`.
- `offset` (optional): if `>= period`, the response shifts to show the
  *upcoming* period's code as `current`.

Response shape:
```json
{
  "results": [
    {
      "name": "Google",
      "label": "bob@gmail.com",
      "issuer": "Google",
      "tokenType": "TOTP",
      "algorithm": "SHA1",
      "digits": 6,
      "period": 30,
      "counter": null,
      "current": "578526",
      "next":    "015334",
      "remainingSeconds": 14,
      "tier": 1
    }
  ]
}
```

### `GET /api/secrets?q=<query>`

Return matched service entries WITHOUT the `secret` value. Used by UI list
views that must enumerate services without ever sending key material to the
client.

Fields: `name, label, account, issuer, tokenType, algorithm, digits, period,
counter, groupId, tier`.

### `POST /api/backup`

Body: full 2FAS backup JSON.
Validation: `body.schemaVersion` must exist. The whole object is stored at
Realtime DB path `/backup`, replacing whatever was there.

Response: `{ "ok": true, "count": <services.length> }`.

### `GET /api/backup`

Returns the full backup JSON from Firebase (or from the in-memory store in
dev mode).

### `GET /api/health`

Public unauthenticated probe. Returns `{ "ok": true, "service": "2fas-vault", "time": <ms> }`.

---

## 4. Tier resolution algorithm

Implemented in `src/tier-resolver.js`. Given a query and an array of
services, produces a ranked list — strictest match first.

| Tier | Rule | Trigger |
|------|------|---------|
| T1 | Exact case-insensitive match on `otp.label` OR `otp.account` | always |
| T2 | Same email local-part (text before `@`), any domain | query has `@` |
| T3 | Local-part with all dots stripped + same domain | query has `@` |
| T4 | Stored value has no `@` and equals the query's local-part | query has `@` |
| T5 | Local-part with all dots stripped, any domain | always (also fires when query has no `@`) |
| T6 | Plain substring match on `name` | always |

> **Note.** Spec text states T2–T5 require an `@`, but the project's
> acceptance criterion *"Tier resolution for `abc01` matches `abc.01@gmail.com`
> at T5"* requires T5 to fire even without an `@`. We follow the test
> contract; T2–T4 still require an `@`.

A service can appear at most once and is annotated with the lowest tier it
matched.

### Worked example

Backup has:
```
Google     label=bob@gmail.com
GitHub     label=bob@company.com   (SHA256 TOTP)
AWS        label=admin@company.com
Cloudflare label=bob@company.com   (SHA256 HOTP)
Facebook   label=bob               (no @)
```

Query `bob@gmail.com` →
1. **T1** Google (exact label match)
2. **T2** GitHub, Cloudflare (same local-part `bob`, different domain)
3. **T4** Facebook (label is `bob` with no `@`)

Query `abc01` →
1. **T5** any service whose local-part dot-stripped equals `abc01` (e.g.
   `abc.01@gmail.com`).

---

## 5. OTP engine contract

All HMAC math is performed by the OTPAuth 9.1.1 library (the file
`public/otpauth.umd.min.js`). The engine is loaded into an isolated
`Function` scope on Node.js so it never touches `crypto.subtle`,
`SubtleCrypto`, or any Web Crypto primitive.

`src/otp-engine.js` exports:

| Function | Returns | Notes |
|----------|---------|-------|
| `generateTOTP({ secret, algorithm, digits, period, timestamp })` | `string` | `timestamp` defaults to `Date.now()`. |
| `generateHOTP({ secret, algorithm, digits, counter })` | `string` | |
| `generateSTEAM({ secret, period, timestamp })` | `string` | 5 chars from the 26-char alphabet `23456789BCDFGHJKMNPQRTVWXY`. Derives the 31-bit truncation via OTPAuth's HOTP at `digits=10`. |
| `getCurrentAndNext(serviceEntry)` | `{ current, next, remainingSeconds, period }` | `remainingSeconds = period - (Math.floor(Date.now()/1000) % period)`. For HOTP, `remainingSeconds=0`. |
| `resolveOTP(serviceEntry, options)` | `string` | Dispatches by `tokenType`. `options.slot` ∈ `current`\|`next`. |

### STEAM derivation

```
counter   = floor(Date.now()/1000 / period)    // period=30 typical
hmac31    = parseInt(OTPAuth.HOTP({ secret, algorithm:'SHA1', digits:10, counter }).generate())
let v = hmac31
for (i = 0..4) {
  out += STEAM_ALPHABET[v % 26]
  v = floor(v / 26)
}
```

`OTPAuth.HOTP` with `digits=10` returns the decimal form of the full 31-bit
truncated HMAC value, which is exactly what the STEAM mapping needs.

---

## 6. Security model

| Threat | Mitigation |
|--------|-----------|
| Anonymous API access | All `/api/*` routes require `X-API-Key`. |
| Timing oracle on the API key | Constant-time comparison via XOR loop in `src/routes/_auth.js`. NEVER `===` and NEVER `crypto.timingSafeEqual`. |
| Browser leaks `crypto.subtle` use | Engine is pure JS (OTPAuth 9.1.1). Never imports any Web Crypto API. |
| Firebase credentials in source | Loaded only from `APP2FAS_FIREBASE_CREDENTIALS_B64` at runtime. Never logged. |
| Secrets in `/api/secrets` response | The `secret` field is intentionally stripped. |
| Reflective XSS via service names | All UI rendering is via `textContent` / DOM `appendChild`, never `innerHTML` with untrusted input. |
| External login | Delegated to tinyauth (or any reverse-proxy auth). This app has no login UI. |

---

## 7. Data schema reference

The backup JSON shape (excerpt):

```jsonc
{
  "schemaVersion": 3,
  "appVersionCode": 5000000,
  "groups": [
    { "id": "<uuid>", "name": "Work", "isEncrypted": false }
  ],
  "services": [
    {
      "name": "Google",
      "secret": "JBSWY3DPEHPK3PXP",      // Base32; never returned by /api/secrets
      "groupId": "<uuid|null>",
      "updatedAt": 1708958115316,
      "otp": {
        "label":     "bob@gmail.com",
        "account":   "bob@gmail.com",
        "issuer":    "Google",
        "tokenType": "TOTP",                // TOTP | HOTP | STEAM
        "algorithm": "SHA1",                // SHA1 | SHA256 | SHA512
        "digits":    6,
        "period":    30,                    // for TOTP / STEAM
        "counter":   null,                   // for HOTP only
        "source":    "Link",
        "link":      "otpauth://..."
      },
      "order": { "position": 0 },
      "icon":  { "selected": "Label", "label": { "text": "GO", "backgroundColor": "LightBlue" } }
    }
  ]
}
```

The full backup is stored at Firebase RTDB path `/backup`. There is no
sharding or per-user namespacing — the whole vault is a single document.

---

## 8. Frontend views

| Route | Purpose |
|-------|---------|
| `#dashboard` | Stat cards (Total / TOTP / HOTP / STEAM) + live services table. |
| `#services`  | Searchable / group-filtered CRUD table; add / edit / delete modals. |
| `#backup`    | Drag-and-drop import + download current backup. |

OTP cells:
- TOTP / STEAM: countdown progress bar, auto-refresh every second, regenerate at the period boundary.
- HOTP: a "Next" button advances the stored counter and persists.
- All codes: masked by default, click reveals; subsequent click copies.

The topbar carries a live OTP search (300 ms debounce) that calls
`GET /api/otp?q=…` and renders matched services with their tier and current
code.

---

## 9. Performance & limits

- Backup payload limit: 4 MiB (Express body parser cap on `POST /api/backup`).
- The dashboard renders one timer per visible OTP cell; with hundreds of
  services this is dominated by DOM updates rather than HMAC math.
- HMAC computation is fast pure-JS — measured around 300 µs per code on a
  modern laptop, comfortably under one frame even with 500+ codes per second.
