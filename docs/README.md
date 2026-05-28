# 2FAS Vault

A self-hostable 2FA management webapp. Generates **TOTP**, **HOTP**, and
**Steam Guard** codes, stores backups in **Firebase Realtime Database**, and
provides a vanilla-JS dashboard styled after the **Falcon Dashboard** design
system. No build step; no Web Crypto API; no native cryptography library.

---

## Why?

- **You own the vault.** Backups live in your Firebase project. The app never
  phones home.
- **Pure-JS HMAC.** OTP generation goes through the bundled OTPAuth 9.1.1 —
  no `crypto.subtle`, no Node `crypto` module. Works identically in the
  browser and on the server.
- **Auth is someone else's problem.** Drop a reverse-proxy authenticator
  (e.g. [tinyauth](https://github.com/steveiliop56/tinyauth)) in front. The
  app itself has no login UI; API endpoints are guarded by an API key.

---

## Prerequisites

- Node.js **≥ 18**
- A Firebase project with **Realtime Database** enabled
- A Firebase **service account** JSON (Project settings → Service accounts → Generate new private key)

---

## Installation

```bash
git clone <your-repo-url>
cd 2fas-vault
npm install
cp .env.example .env
$EDITOR .env
```

### Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `APP2FAS_PORT` | no | HTTP port (default `3000`) |
| `APP2FAS_API_SECRET` | yes | Long random string. Sent as `X-API-Key` on every API call. |
| `APP2FAS_FIREBASE_CREDENTIALS_B64` | yes | Base64 of the service-account JSON. Must contain `project_id`, `databaseURL`, `client_email`, `private_key`. |
| `APP2FAS_ALLOW_MEMORY_FALLBACK` | no | Dev only — set to `1` to run without Firebase (in-memory backup). |
| `NODE_ENV` | no | Set to `production` to suppress error message bodies in 5xx responses. |

To produce the base64 value:

```bash
base64 -w 0 path/to/serviceAccountKey.json
```

---

## Run locally

```bash
npm start                          # → http://localhost:3000
```

Or with explicit env:

```bash
APP2FAS_PORT=4000 \
APP2FAS_API_SECRET=$(openssl rand -hex 32) \
APP2FAS_FIREBASE_CREDENTIALS_B64="$(base64 -w 0 svc.json)" \
node server.js
```

In dev with no Firebase:

```bash
APP2FAS_API_SECRET=dev-only-please-change \
APP2FAS_ALLOW_MEMORY_FALLBACK=1 \
node server.js
```

Open the browser, click **Set API key** in the topbar, paste your
`APP2FAS_API_SECRET`. The dashboard will start populating immediately.

---

## Docker (one-liner)

```bash
docker run --rm -p 3000:3000 \
  -e APP2FAS_API_SECRET="$(openssl rand -hex 32)" \
  -e APP2FAS_FIREBASE_CREDENTIALS_B64="$(base64 -w 0 svc.json)" \
  -v "$(pwd)":/app -w /app node:20-alpine \
  sh -c "npm install --silent && node server.js"
```

For a production image, copy this into a `Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## API quick reference

All endpoints under `/api/*` require the header `X-API-Key: $APP2FAS_API_SECRET`.

```bash
# Health (unauthenticated)
curl http://localhost:3000/api/health

# Push the entire 2FAS backup
curl -X POST http://localhost:3000/api/backup \
     -H "X-API-Key: $APP2FAS_API_SECRET" \
     -H "Content-Type: application/json" \
     --data-binary @path/to/2fas-backup.json

# Live OTP for a label
curl -G --data-urlencode "q=bob@gmail.com" \
     -H "X-API-Key: $APP2FAS_API_SECRET" \
     http://localhost:3000/api/otp

# Service metadata (NEVER includes secrets)
curl -G --data-urlencode "q=bob@company.com" \
     -H "X-API-Key: $APP2FAS_API_SECRET" \
     http://localhost:3000/api/secrets

# Dump the full backup
curl -H "X-API-Key: $APP2FAS_API_SECRET" \
     http://localhost:3000/api/backup
```

See [SPEC.md](./SPEC.md) for full request / response shapes.

---

## File layout

```
2fas-vault/
├── src/
│   ├── otp-engine.js        ← isomorphic OTP module (Node + browser)
│   ├── firebase.js          ← Firebase admin client
│   ├── tier-resolver.js     ← multi-tier label/account search
│   └── routes/
│       ├── _auth.js         ← constant-time XOR API-key middleware
│       ├── otp.js           ← GET /api/otp
│       ├── secrets.js       ← GET /api/secrets
│       └── backup.js        ← GET / POST /api/backup
├── public/
│   ├── index.html           ← SPA shell
│   ├── app.js               ← frontend logic
│   ├── otpauth.umd.min.js   ← bundled OTPAuth 9.1.1 (do not modify)
│   └── style.css            ← Falcon tokens + components
├── docs/
│   ├── SPEC.md              ← full architecture + API spec
│   ├── README.md            ← (this file)
│   └── GUIDELINE.md         ← contributor / extension guide
├── .env.example
├── server.js                ← Express entry point
└── package.json
```

---

## Known limitations

- The whole backup is stored as a single Firebase node — no per-user sharding.
- Counter persistence for HOTP requires a write to Firebase, so HOTP "Next" has
  ~150 ms latency depending on your DB region.
- The frontend keeps the API key in `localStorage` for ergonomics. Anyone with
  XSS in your tinyauth-protected page can read it. Don't reuse this key for
  anything else.
- No multi-tenant support out of the box.
- The browser must load `otpauth.umd.min.js` (~50 KB un-gzipped) before the
  dashboard becomes interactive.

---

## License

Private / internal — adapt as needed for your org.
