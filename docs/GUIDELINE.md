# Contributor / Extension Guideline

How to safely modify or extend 2FAS Vault. **Read this before sending a PR.**

---

## 1. Adding a new OTP token type

The engine in `src/otp-engine.js` dispatches by `tokenType`. To add a new type
(say `MOTP`):

1. **Implement** the generator alongside `generateTOTP / generateHOTP /
   generateSTEAM`. Use only OTPAuth primitives — never call `crypto.subtle`,
   `SubtleCrypto`, or any Node `crypto` API. If your algorithm requires a
   primitive OTPAuth doesn't expose, implement it from scratch in pure JS.
2. **Register** the type in `getCurrentAndNext` and `resolveOTP` switch
   blocks.
3. **Update** `src/routes/otp.js` to accept the new value in the `type` query
   parameter validator.
4. **Update** the frontend `generateForService` in `public/app.js` and add a
   badge style in `style.css` (`badge-<color>` from the existing palette;
   never invent new colors).
5. **Document** it in `docs/SPEC.md` § 5 with the full algorithm spec.
6. **Test** with at least one canonical RFC vector if your type has one.

---

## 2. Extending tier resolution

`src/tier-resolver.js` walks tiers T1..T6 in order and returns a deduplicated,
ranked list. To add a tier:

1. Decide where it sits in the strictness order. Tiers are evaluated top-down,
   and each service gets the *first* tier it qualifies for.
2. Add a labelled block following the existing pattern. Use the helpers
   `lc`, `splitEmail`, `emailParts`, `stripDots`.
3. Always call `pushIfNew(svc, tier, matchedField)` — the helper deduplicates
   by reference identity. Never push duplicates manually.
4. Update `docs/SPEC.md` § 4.

> If two tiers share the same priority, that is a smell. Either merge them or
> resolve the ambiguity explicitly with a sub-rule.

---

## 3. Swapping Firebase for another store

`src/firebase.js` is the only module that talks to the data store. The
contract is:

```
getServices()              → Promise<Service[]>
getBackup()                → Promise<Backup>
setBackup(backupJson)      → Promise<void>
```

To plug in something else (e.g. SQLite, S3, Redis):

1. Create `src/<your-store>.js` exporting the same three functions.
2. Update `src/routes/backup.js`, `src/routes/otp.js`, `src/routes/secrets.js`
   to import from your new module.
3. Delete `firebase-admin` from `package.json` if no longer needed.

**Do NOT** scatter store-specific code across the routes — keep the
abstraction tight.

---

## 4. Code style rules

- **No native crypto.** Anywhere. The whole point of this project is to be
  reproducible with pure JS HMAC. If a feature *truly* needs native crypto,
  open an issue and discuss before committing.
- **No `===` on secrets.** Use the constant-time helper in
  `src/routes/_auth.js`. If you need a similar primitive elsewhere, export
  it from there — do not roll your own copy.
- **No `crypto.timingSafeEqual`.** Period.
- **No hardcoded colors / radii / fonts.** All UI tokens are CSS custom
  properties on `:root` in `public/style.css`. Reference them via
  `var(--falcon-*)`. If a value isn't there, add it to the token sheet first.
- **No component libraries.** Vanilla DOM only. Material UI / Ant / Chakra are
  banned because they impose their own design tokens.
- **No `innerHTML`** with untrusted input. Use `textContent` or
  `appendChild(text)`. The `el(...)` helper handles this for you when given
  a string child.
- **Sidebar background** is always `#0b1727` (`var(--falcon-surface-sidebar)`).
- **Cards** never have a `border` — use box-shadow only. Container
  `border-radius` never exceeds `12px` (`var(--falcon-rounded-xl)`).
- **Poppins** is the only font. Loaded from Google Fonts in `index.html`.
- **`label-caps`** typography is always `text-transform: uppercase` — never
  manually uppercased in content strings.

---

## 5. PR checklist

Before opening a PR, please confirm:

- [ ] `node server.js` boots with no errors against a valid `.env`.
- [ ] All acceptance tests in [SPEC.md § 1](./SPEC.md) still pass.
- [ ] No new dependency on `crypto.subtle` / `SubtleCrypto` / `Web Crypto API`.
- [ ] No new dependency on `crypto.timingSafeEqual`.
- [ ] No hex colors in component CSS — only `var(--falcon-*)`.
- [ ] No `border` on cards (shadow only).
- [ ] Sidebar still `#0b1727` after your changes.
- [ ] No secrets in any `console.log` (search `git diff` for `secret`,
      `apiKey`, `private_key`).
- [ ] `GET /api/secrets` response still has zero `secret` fields.
- [ ] If you added a new env var, it starts with `APP2FAS_` and is
      documented in `.env.example` and `docs/SPEC.md` § 2.
- [ ] If you touched the backup schema, you bumped `schemaVersion` and
      documented the migration path.

---

## 6. Security considerations

- **Never log decoded credentials.** `src/firebase.js` keeps the parsed
  service-account object in module closure. If you add diagnostics, log
  `"creds loaded"` and never `JSON.stringify(creds)`.
- **API key handling.** Validated on every request via XOR loop. The middleware
  is shared (`src/routes/_auth.js`); do not re-implement it inline.
- **Env hygiene.** `.env` is `.gitignore`d at the repo root. Never commit a
  file that contains a real `APP2FAS_FIREBASE_CREDENTIALS_B64`.
- **CORS.** This app does not enable CORS by default. If you need cross-origin
  access, add an explicit allow-list — never `*` while serving secrets.
- **Rate limiting.** Out of scope for this app; add at the reverse-proxy
  layer if you expose it to the internet.
- **HOTP counter writes** must always go through `setBackup` (which replaces
  the entire backup). If you switch to per-service writes, make them atomic
  per service and document the new contract.

---

## 7. Local testing tips

- **In-memory mode.** Set `APP2FAS_ALLOW_MEMORY_FALLBACK=1` and skip
  Firebase entirely. Reset by restarting the process.
- **Seed the in-memory store** by `POST /api/backup` with a sample JSON.
- **Cross-check OTP values** with another tool (e.g. `oathtool`) using the
  same secret. RFC 6238 vectors exist for `JBSWY3DPEHPK3PXP`.
- **STEAM verification.** Use the official Steam mobile app or any STEAM
  authenticator with the same secret. The 5-char output should match.
- **Tier resolver tests** can be run directly:
  ```js
  const { resolveServices } = require('./src/tier-resolver.js');
  console.log(resolveServices('abc01', [
    { name: 'X', otp: { label: 'abc.01@gmail.com' } }
  ]));
  ```
