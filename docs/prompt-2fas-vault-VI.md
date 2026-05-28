# Prompt: 2FAS Vault — Claude Code (Tiếng Việt)

---

```
<context>
Bạn đang triển khai webapp quản lý 2FA hoàn chỉnh tên "2FAS Vault". Stack: Node.js + Express backend, Vanilla JS frontend thuần. Toàn bộ giao diện PHẢI tuân thủ design system Falcon Dashboard (DESIGN.md). Không được dùng bất kỳ component library nào có design token riêng.

Các quyết định đã chốt:
- Sinh mã OTP: dùng class thuần JS `Oe` từ otpauth.umd.min.js — TUYỆT ĐỐI không dùng crypto.subtle, window.crypto, hoặc bất kỳ Web Crypto API nào
- Lưu trữ: Firebase Realtime Database
- Xác thực: do tinyauth xử lý ở layer ngoài — app này không có UI đăng nhập
- Tất cả env vars PHẢI có prefix APP2FAS_
- Design: Falcon Dashboard — font Poppins, sidebar navy #0b1727, primary #2c7be5
</context>

<task>
Tạo và triển khai toàn bộ project. Làm tuần tự từng phase. Sau mỗi phase output: ✅ [tên phase] — [file đã tạo/sửa].
</task>

<phases>

## PHASE 1 — Scaffold project
Tạo cấu trúc thư mục sau đây chính xác:
```
2fas-vault/
├── src/
│   ├── otp-engine.js        # module OTP isomorphic
│   ├── firebase.js          # Firebase admin client
│   ├── tier-resolver.js     # tìm kiếm multi-tier
│   └── routes/
│       ├── otp.js
│       ├── secrets.js
│       └── backup.js
├── public/
│   ├── index.html           # SPA shell
│   ├── app.js               # frontend logic
│   ├── otpauth.umd.min.js   # copy nguyên từ file gốc, không sửa
│   └── style.css            # Falcon tokens dạng CSS custom properties
├── docs/
│   ├── SPEC.md
│   ├── README.md
│   └── GUIDELINE.md
├── .env.example
├── server.js
└── package.json
```

## PHASE 2 — OTP Engine (src/otp-engine.js)
RÀNG BUỘC QUAN TRỌNG:
- File PHẢI chạy được ở cả Node.js (require) VÀ browser (script tag global) — không thay đổi gì
- TUYỆT ĐỐI không import hoặc gọi crypto.subtle, window.crypto, SubtleCrypto, hoặc bất kỳ Web Crypto API nào
- Toàn bộ HMAC lấy từ class `Oe` trong otpauth.umd.min.js
- Export/expose các hàm sau:
  - `generateTOTP({ secret, algorithm, digits, period, timestamp })` — timestamp mặc định Date.now()
  - `generateHOTP({ secret, algorithm, digits, counter })`
  - `generateSTEAM({ secret, period, timestamp })` — dùng bảng chữ 26 ký tự "23456789BCDFGHJKMNPQRTVWXY", derive từ TOTP SHA1 nhưng map bytes theo cách riêng
  - `getCurrentAndNext(serviceEntry)` → `{ current: string, next: string, remainingSeconds: number, period: number }`
  - `resolveOTP(serviceEntry, options)` → string — dispatch theo tokenType: TOTP | HOTP | STEAM

Ở Node.js, inline toàn bộ source otpauth.umd.min.js qua wrapper self-executing để module tự đóng gói. Ở browser, dùng object OTPAuth đã load global.

## PHASE 3 — Tier Resolver (src/tier-resolver.js)
Với query "abc.01@gmail.com", sinh các tier tìm kiếm theo thứ tự:
- T1: khớp chính xác trường label HOẶC account
- T2: cùng local-part (trước @), bất kỳ domain — chỉ khi query có @
- T3: local-part bỏ dấu chấm, giữ domain gốc — chỉ khi query có @
- T4: chỉ lấy local-part (trước @) — chỉ khi query có @
- T5: local-part bỏ toàn bộ dấu chấm — chỉ khi query có @
- T6: substring match trên trường name (fallback)

Trả về mảng service đã xếp hạng, không trùng lặp, giữ nguyên data gốc.

Export: `resolveServices(query, allServices) → Service[]`

## PHASE 4 — Firebase client (src/firebase.js)
- Đọc APP2FAS_FIREBASE_CREDENTIALS_B64 từ env: base64-decode → parse JSON → khởi tạo firebase-admin
- JSON sau giải mã chứa các trường `project_id` và `databaseURL`
- Export:
  - `getServices() → Promise<Service[]>`
  - `setBackup(backupJson) → Promise<void>` — thay thế toàn bộ backup tại path /backup
  - `getBackup() → Promise<object>`
- TUYỆT ĐỐI không log hoặc expose object credentials đã giải mã

## PHASE 5 — API Routes

### GET /api/otp
Query params: `q` (bắt buộc), `type` (totp|hotp|steam, mặc định: lấy từ tokenType đã lưu), `offset` (0 = period hiện tại, 30 = period tiếp theo tính bằng giây)
- Dùng resolveServices tìm matches
- Gọi resolveOTP cho từng match với options phù hợp
- Trả về: `{ results: [{ name, label, issuer, tokenType, current, next, remainingSeconds, tier }] }`
- Auth: validate header `X-API-Key` với APP2FAS_API_SECRET bằng vòng lặp XOR — KHÔNG dùng === hay crypto.timingSafeEqual

### GET /api/secrets
Query params: `q` (bắt buộc)
- Trả về services đã khớp ĐÃ LOẠI BỎ trường secret — chỉ trả: name, label, account, issuer, tokenType, algorithm, digits, period/counter, groupId, tier
- Cùng xác thực API key

### POST /api/backup
- Body: full 2fas-backup.json dạng JSON
- Validate trường schemaVersion tồn tại
- Gọi setBackup
- Trả về `{ ok: true, count: services.length }`
- Cùng xác thực API key

### GET /api/backup
- Trả về toàn bộ backup JSON từ Firebase
- Cùng xác thực API key

## PHASE 6 — Server (server.js)
- Express app, port từ APP2FAS_PORT (mặc định 3000)
- Mount routes tại /api
- Serve /public tĩnh
- Không session, không cookie — tinyauth xử lý auth ngoài
- Error handler: trả `{ error: message }` JSON, không bao giờ leak stack trace khi production

## PHASE 7 — Frontend (public/)

### style.css
Định nghĩa TẤT CẢ token Falcon làm CSS custom properties trên :root. Bao gồm mọi màu sắc, spacing, shadow, border-radius từ DESIGN.md. KHÔNG hardcode hex trong component rules — luôn dùng var(--falcon-*).

### index.html + app.js
Xây SPA với hash routing (#dashboard, #services, #backup):

**Sidebar (300px, bg #0b1727):**
- Logo zone: text "2FAS Vault" + icon khiên SVG inline
- Nav items: Dashboard, Services, Backup/Import
- Tuân thủ đúng spec Falcon sidebar-item và sidebar-item-active

**Topbar (60px):**
- Ô tìm kiếm (theo spec topbar-search) với OTP lookup trực tiếp
- Đồng hồ hiển thị giờ hiện tại + vòng đếm ngược 30s cho TOTP period
- Toast "Đã sao chép" khi click OTP

**View #dashboard:**
- Hàng stat cards: Tổng Services, số TOTP, số HOTP, số STEAM
- Bảng services: name, issuer, account, badge loại, OTP hiện tại (ẩn mặc định, click để hiện), nút copy, progress bar đếm ngược
- OTP tự refresh mỗi giây; tái sinh tại ranh giới period
- Dùng otpauth.umd.min.js load trong browser để sinh OTP phía client (không cần gọi API để hiển thị)

**View #services:**
- CRUD đầy đủ cho services
- Modal Add/Edit (modal-default 520px) với tất cả trường từ schema 2fas-backup
- Modal xác nhận xóa (modal-sm 400px) với nút danger
- Dropdown filter theo group
- Thanh tìm kiếm lọc bảng theo thời gian thực

**View #backup:**
- Vùng upload: drag-and-drop hoặc file picker cho .json
- Xem trước số lượng services trước khi xác nhận upload
- Nút download backup hiện tại
- Import gọi POST /api/backup; download gọi GET /api/backup

**Quy tắc hiển thị OTP:**
- TOTP/STEAM: hiện progress bar đếm ngược, tự refresh
- HOTP: hiện nút "Next" tăng counter, không auto-refresh
- Tất cả mã: click copy vào clipboard, hiện toast "Đã sao chép!" (tự tắt sau 4s)
- Mã ẩn dạng •••••• mặc định; hover/click để hiện

## PHASE 8 — Tài liệu (docs/)

### SPEC.md
Bao gồm: sơ đồ kiến trúc ASCII, tất cả API endpoints với request/response shapes, bảng env vars, thuật toán tier resolution kèm ví dụ, interface contract của OTP engine, mô hình bảo mật (tinyauth + API key), tham chiếu data schema.

### README.md
Bao gồm: yêu cầu hệ thống, các bước cài đặt, thiết lập env với bảng APP2FAS_ vars, chạy local, Docker one-liner, ví dụ API với curl, known limitations.

### GUIDELINE.md
Bao gồm: cách thêm token type mới, cách mở rộng tier resolution, cách thay Firebase bằng store khác (interface contract), quy tắc code style, PR checklist, các lưu ý bảo mật (không log secrets, quản lý env, constant-time compare).

## PHASE 9 — .env.example
```
APP2FAS_PORT=3000
APP2FAS_API_SECRET=thay-bang-chuoi-ngau-nhien-dai
APP2FAS_FIREBASE_CREDENTIALS_B64=<base64 của serviceAccountKey.json>
# JSON sau giải mã phải chứa: project_id, databaseURL, client_email, private_key
```
</phases>

<constraints>
PHẢI:
- otp-engine.js PHẢI tự đóng gói, không cần native crypto bất kỳ
- Mọi API route PHẢI validate X-API-Key trước khi xử lý
- Mọi giá trị màu/spacing trong CSS PHẢI dùng Falcon CSS custom properties (var(--falcon-*))
- Sidebar PHẢI luôn là bg #0b1727 ở mọi view
- Sinh STEAM token PHẢI dùng bảng 26 ký tự riêng và byte-mapping khác TOTP thường
- getCurrentAndNext PHẢI tính remainingSeconds là (period - (Math.floor(Date.now()/1000) % period))
- So sánh API key theo thời gian không đổi PHẢI dùng vòng lặp XOR, không dùng === hay crypto.timingSafeEqual

TUYỆT ĐỐI KHÔNG:
- Gọi crypto.subtle, SubtleCrypto, window.crypto.getRandomValues cho HMAC
- Hardcode secret, key, hoặc Firebase credentials trong bất kỳ source file nào
- Trả về trường secret trong response GET /api/secrets
- Dùng border trên card — chỉ dùng shadow
- Dùng font khác Poppins
- border-radius > 12px trên bất kỳ container nào
- Cài Material UI, Ant Design, Chakra, hoặc tương tự
- Log object credentials Firebase đã giải mã

DỪNG LẠI VÀ HỎI trước khi:
- Thay đổi cấu trúc path dữ liệu trong Firebase
- Thêm bất kỳ auth middleware nào (tinyauth xử lý điều này từ bên ngoài)
- Cài thêm thư viện cryptography bất kỳ
</constraints>

<acceptance_criteria>
- [ ] `node server.js` khởi động không lỗi với .env hợp lệ
- [ ] GET /api/otp?q=bob@gmail.com trả đúng TOTP hiện tại cho entry Google từ dữ liệu mẫu
- [ ] GET /api/otp?q=bob@company.com trả về cả GitHub (SHA256) và Cloudflare (HOTP)
- [ ] Tier resolution cho "abc01" khớp "abc.01@gmail.com" tại T5
- [ ] STEAM token cho entry mẫu dùng output bảng 26 ký tự
- [ ] Frontend dashboard load được, hiện đủ 6 services mẫu, OTP tự cập nhật live
- [ ] Upload backup qua UI gọi POST /api/backup và refresh bảng
- [ ] Không có giá trị secret trong response GET /api/secrets
- [ ] Tất cả card dùng box-shadow, không border
- [ ] Sidebar luôn là #0b1727 ở mọi view
</acceptance_criteria>

<output_contract>
Xuất toàn bộ file với nội dung đầy đủ. Không placeholder kiểu "// TODO implement". Không cắt bớt. Sau file cuối cùng, xuất bảng tóm tắt: đường dẫn file | số dòng | trạng thái.
</output_contract>
```

---

> ⚠️ **Trước khi paste:** Prompt này dành cho Claude Code (CLI) — công cụ agentic có quyền truy cập filesystem thực. Đảm bảo file `otpauth.umd.min.js` và `DESIGN.md` có trong thư mục làm việc. Xác nhận Firebase project đã bật Realtime Database trước khi chạy.
