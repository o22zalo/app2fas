# Prompt: 2FAS Vault — Claude Code (English)

---

```
<context>
You are implementing a complete production-ready 2FA management webapp called "2FAS Vault". The stack is Node.js + Express backend with a pure Vanilla JS frontend. All design must strictly follow the Falcon Dashboard design system (DESIGN.md). No component libraries with their own tokens are permitted.

Prior decisions locked:
- OTP generation: pure-JS class `Oe` from otpauth.umd.min.js — NEVER use crypto.subtle, window.crypto, or any Web Crypto API
- Storage: Firebase Realtime Database only
- Auth: handled externally by tinyauth — this app has no login UI
- All env vars MUST use prefix APP2FAS_
- Design: Falcon Dashboard spec (DESIGN.md) — Poppins font, navy sidebar #0b1727, primary #2c7be5
</context>

<task>
Scaffold and implement the entire project. Work sequentially through phases. After each phase output: ✅ [phase name] — [files created/modified].
</task>

<phases>

## PHASE 1 — Project scaffold
Create this exact directory structure:
```
2fas-vault/
├── src/
│   ├── otp-engine.js        # isomorphic OTP module
│   ├── firebase.js          # Firebase admin client
│   ├── tier-resolver.js     # multi-tier label/account search
│   └── routes/
│       ├── otp.js
│       ├── secrets.js
│       └── backup.js
├── public/
│   ├── index.html           # SPA shell
│   ├── app.js               # frontend logic
│   ├── otpauth.umd.min.js   # copied from project file (do not modify)
│   └── style.css            # Falcon tokens as CSS custom properties
├── docs/
│   ├── SPEC.md
│   ├── README.md
│   └── GUIDELINE.md
├── .env.example
├── server.js
└── package.json
```

## PHASE 2 — OTP Engine (src/otp-engine.js)
CRITICAL CONSTRAINTS:
- This file MUST work identically in Node.js (require) AND browser (script tag global)
- NEVER import or call crypto.subtle, window.crypto, SubtleCrypto, or any Web Crypto API
- The entire HMAC implementation comes from the `Oe` class in otpauth.umd.min.js
- Export/expose these functions:
  - `generateTOTP({ secret, algorithm, digits, period, timestamp })` — timestamp defaults to Date.now()
  - `generateHOTP({ secret, algorithm, digits, counter })`
  - `generateSTEAM({ secret, period, timestamp })` — STEAM uses a 5-char alphanumeric alphabet "23456789BCDFGHJKMNPQRTVWXY", derives from TOTP SHA1 but maps bytes differently
  - `getCurrentAndNext(serviceEntry)` → `{ current: string, next: string, remainingSeconds: number, period: number }`
  - `resolveOTP(serviceEntry, options)` → string — dispatches by tokenType: TOTP | HOTP | STEAM

In Node.js, inline the full otpauth.umd.min.js source via a self-executing require wrapper so the module is self-contained. In browser, rely on the globally loaded OTPAuth object.

## PHASE 3 — Tier Resolver (src/tier-resolver.js)
Given a query string (e.g. "abc.01@gmail.com"), generate search tiers in order:
- T1: exact match on label OR account field
- T2: same local-part (before @), any domain — only if query contains @
- T3: local-part with dots stripped, original domain — only if query contains @
- T4: local-part only (before @) — only if query contains @
- T5: local-part with all dots stripped — only if query contains @
- T6: plain substring match on name field (fallback)

Return ranked array of matched service objects. No duplicates. Preserve original service data.

Export: `resolveServices(query, allServices) → Service[]`

## PHASE 4 — Firebase client (src/firebase.js)
- Read APP2FAS_FIREBASE_CREDENTIALS_B64 from env: base64-decode → parse JSON → initialize firebase-admin
- The decoded JSON contains `project_id` and `databaseURL` fields
- Export:
  - `getServices() → Promise<Service[]>`
  - `setBackup(backupJson) → Promise<void>` — replaces entire backup at path /backup
  - `getBackup() → Promise<object>`
- NEVER log or expose the decoded credentials object

## PHASE 5 — API Routes

### GET /api/otp
Query params: `q` (required), `type` (totp|hotp|steam, default: from stored tokenType), `offset` (0 = current period, 30 = next period in seconds)
- Use resolveServices to find matches
- For each match call resolveOTP with appropriate options
- Return: `{ results: [{ name, label, issuer, tokenType, current, next, remainingSeconds, tier }] }`
- Auth: validate header `X-API-Key` against APP2FAS_API_SECRET (constant-time string compare using XOR loop — NEVER use crypto.timingSafeEqual)

### GET /api/secrets
Query params: `q` (required)
- Return matched services WITHOUT secret values — return only: name, label, account, issuer, tokenType, algorithm, digits, period/counter, groupId, tier
- Same API key auth

### POST /api/backup
- Body: full 2fas-backup.json as JSON
- Validate schemaVersion field exists
- Call setBackup
- Return `{ ok: true, count: services.length }`
- Same API key auth

### GET /api/backup
- Return full backup JSON from Firebase
- Same API key auth

## PHASE 6 — Server (server.js)
- Express app, port from APP2FAS_PORT (default 3000)
- Mount routes under /api
- Serve /public as static
- No session, no cookies — tinyauth handles auth externally
- Error handler: return `{ error: message }` JSON, never stack traces in production

## PHASE 7 — Frontend (public/)

### style.css
Define ALL Falcon tokens as CSS custom properties on :root. Include every color, spacing, shadow, and border-radius from DESIGN.md. NEVER hardcode hex values in component rules — always reference var(--falcon-*).

### index.html + app.js
Build a single-page application with these views, switchable via hash routing (#dashboard, #services, #backup):

**Sidebar (300px, bg #0b1727):**
- Logo zone: "2FAS Vault" text + shield icon SVG
- Nav items: Dashboard, Services, Backup/Import
- Follows Falcon sidebar-item and sidebar-item-active specs exactly

**Topbar (60px):**
- Search input (topbar-search spec) with live OTP lookup
- Clock showing current time + countdown ring for 30s TOTP period
- "Copy" feedback toast on OTP click

**#dashboard view:**
- Stat cards row: Total Services, TOTP count, HOTP count, STEAM count
- Services table: name, issuer, account, type badge, current OTP (masked by default, click to reveal), copy button, countdown bar
- OTP values auto-refresh every second; regenerate at period boundary
- Use otpauth.umd.min.js loaded in browser for client-side OTP generation (no API call needed for display)

**#services view:**
- Full CRUD table for services
- Add/Edit modal (modal-default 520px) with all fields from 2fas-backup schema
- Delete confirmation modal (modal-sm 400px) with danger button
- Group filter dropdown
- Search bar filters table in real time

**#backup view:**
- Upload zone: drag-and-drop or file picker for .json
- Preview parsed service count before confirming upload
- Download current backup button
- Import calls POST /api/backup; download calls GET /api/backup

**OTP display rules:**
- TOTP/STEAM: show countdown progress bar, auto-refresh
- HOTP: show "Next" button to increment counter, no auto-refresh
- All codes: click copies to clipboard, shows "Copied!" toast (auto-dismiss 4s)
- Codes masked as •••••• by default; hover/click reveals

## PHASE 8 — Docs (docs/)

### SPEC.md
Include: architecture diagram (ASCII), all API endpoints with request/response shapes, env var table, tier resolution algorithm with example, OTP engine interface contract, security model (tinyauth + API key), data schema reference.

### README.md
Include: prerequisites, installation steps, env setup with APP2FAS_ vars table, running locally, Docker one-liner, API usage examples with curl, known limitations.

### GUIDELINE.md
Include: how to add a new OTP token type, how to extend tier resolution, how to swap Firebase for another store (interface contract), code style rules, PR checklist, security considerations (never log secrets, env hygiene, constant-time compare).

## PHASE 9 — .env.example
```
APP2FAS_PORT=3000
APP2FAS_API_SECRET=change-me-use-a-long-random-string
APP2FAS_FIREBASE_CREDENTIALS_B64=<base64 of your Firebase serviceAccountKey.json>
# The decoded JSON must contain: project_id, databaseURL, client_email, private_key
```
</phases>

<constraints>
MUST:
- otp-engine.js MUST be self-contained and work without any native crypto
- Every API route MUST validate X-API-Key before processing
- All CSS color/spacing values MUST use Falcon CSS custom properties (var(--falcon-*))
- Sidebar MUST always be bg #0b1727
- STEAM token generation MUST use its custom 26-char alphabet and byte-mapping, not standard TOTP output
- getCurrentAndNext MUST compute remainingSeconds as (period - (Math.floor(Date.now()/1000) % period))
- Constant-time API key comparison MUST use XOR loop, not === or crypto.timingSafeEqual

NEVER:
- NEVER call crypto.subtle, SubtleCrypto, window.crypto.getRandomValues for HMAC
- NEVER hardcode secrets, keys, or Firebase credentials in source files
- NEVER return secret field values in GET /api/secrets response
- NEVER use border on cards — shadow only
- NEVER use any font other than Poppins
- NEVER use border-radius > 12px on containers
- NEVER install Material UI, Ant Design, Chakra, or similar
- NEVER log decoded Firebase credentials object

STOP AND ASK before:
- Changing the Firebase data path structure
- Adding any authentication middleware (tinyauth handles this externally)
- Installing any cryptography library
</constraints>

<acceptance_criteria>
- [ ] `node server.js` starts without errors given valid .env
- [ ] GET /api/otp?q=bob@gmail.com returns correct current TOTP for Google entry from sample data
- [ ] GET /api/otp?q=bob@company.com returns both GitHub (SHA256) and Cloudflare (HOTP) entries
- [ ] Tier resolution for "abc01" matches "abc.01@gmail.com" at T5
- [ ] STEAM token for sample entry uses 26-char alphabet output
- [ ] Frontend dashboard loads, shows all 6 sample services, OTP values update live
- [ ] Backup upload via UI calls POST /api/backup and refreshes table
- [ ] No secret values appear in GET /api/secrets response
- [ ] All cards use box-shadow, zero border
- [ ] Sidebar is always #0b1727 in all views
</acceptance_criteria>

<output_contract>
Deliver all files with full content. No placeholders like "// TODO implement". No truncation. After the final file, output a summary table: file path | lines | status.
</output_contract>
```

---

> ⚠️ **Before pasting:** This prompt targets Claude Code (CLI) — an agentic tool with real filesystem access. Ensure `otpauth.umd.min.js` and `DESIGN.md` are present in the working directory. Confirm your Firebase project has Realtime Database enabled before running.
