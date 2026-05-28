/* =============================================================================
 * 2FAS Vault — Frontend SPA logic
 *
 * Responsibilities:
 *   - Hash-based routing (#dashboard, #services, #backup)
 *   - Live OTP generation in the browser using OTPAuth (no Web Crypto)
 *   - CRUD over services via /api/backup
 *   - Backup import / export via /api/backup
 *   - Top-bar live search via /api/otp
 *
 * Key constraints:
 *   - All HMAC math is performed by `OTPAuth` (loaded via <script>).
 *   - We NEVER call window.crypto.subtle or any Web Crypto API.
 *   - Every API call attaches the X-API-Key header (managed via the topbar).
 * =========================================================================== */

(function () {
  'use strict';

  // ---------- Tiny DOM helpers --------------------------------------------
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        const v = attrs[k];
        if (k === 'class') node.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else if (k.indexOf('on') === 0 && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (k === 'html') node.innerHTML = v;
        else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v === true ? '' : v);
      });
    }
    if (children) {
      const arr = Array.isArray(children) ? children : [children];
      arr.forEach((c) => {
        if (c == null || c === false) return;
        if (typeof c === 'string' || typeof c === 'number') node.appendChild(document.createTextNode(String(c)));
        else node.appendChild(c);
      });
    }
    return node;
  }
  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---------- Toasts -------------------------------------------------------
  const toastStack = $('#toast-stack');
  function toast(msg, kind) {
    kind = kind || 'info';
    const node = el('div', { class: 'toast toast-' + kind }, [
      el('span', { class: 'toast-icon' }, ''), // placeholder for icon
      el('span', { class: 'toast-msg' }, msg),
    ]);
    toastStack.appendChild(node);
    setTimeout(() => {
      node.classList.add('toast-fade');
      setTimeout(() => node.remove(), 220);
    }, 4000);
  }

  // ---------- API key persistence ------------------------------------------
  const KEY_STORAGE = '2fas-vault.apiKey';
  function getApiKey() { return localStorage.getItem(KEY_STORAGE) || ''; }
  function setApiKey(k) { localStorage.setItem(KEY_STORAGE, k || ''); refreshApiKeyBtn(); }
  function refreshApiKeyBtn() {
    const k = getApiKey();
    $('#api-key-label').textContent = k ? 'API key set' : 'Set API key';
  }
  $('#api-key-btn').addEventListener('click', () => {
    openApiKeyModal();
  });

  function openApiKeyModal() {
    openModal({
      size: 'sm',
      title: 'Set API key',
      body: () => {
        const wrap = el('div');
        wrap.appendChild(el('div', { class: 'form-group' }, [
          el('label', { class: 'form-label' }, 'X-API-Key'),
          el('input', {
            class: 'input', id: 'api-key-input', type: 'password',
            placeholder: 'paste your APP2FAS_API_SECRET', value: getApiKey(),
          }),
          el('div', { class: 'form-helper' },
            'Stored locally in your browser. The server validates this key on every /api request.'),
        ]));
        return wrap;
      },
      footer: (close) => [
        el('button', { class: 'btn btn-light', onclick: close }, 'Cancel'),
        el('button', {
          class: 'btn btn-primary',
          onclick: () => {
            const v = $('#api-key-input').value.trim();
            setApiKey(v);
            toast('API key saved.', 'success');
            close();
            // refresh current view
            navigate(currentRoute, true);
          },
        }, 'Save'),
      ],
    });
  }

  // ---------- API client ---------------------------------------------------
  async function apiFetch(path, opts) {
    opts = opts || {};
    const headers = Object.assign({}, opts.headers || {});
    headers['X-API-Key'] = getApiKey();
    if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const res = await fetch(path, Object.assign({}, opts, { headers: headers }));
    let data = null;
    const text = await res.text();
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
    if (!res.ok) {
      const msg = (data && data.error) || ('HTTP ' + res.status);
      const err = new Error(msg); err.status = res.status; err.data = data;
      throw err;
    }
    return data;
  }
  const api = {
    getBackup:    () => apiFetch('/api/backup'),
    setBackup:    (json) => apiFetch('/api/backup', { method: 'POST', body: JSON.stringify(json) }),
    searchOtp:    (q) => apiFetch('/api/otp?q=' + encodeURIComponent(q)),
  };

  // ---------- Backup state cache ------------------------------------------
  let cachedBackup = null;
  async function ensureBackup(force) {
    if (!cachedBackup || force) {
      cachedBackup = await api.getBackup();
      if (!cachedBackup || typeof cachedBackup !== 'object') cachedBackup = { schemaVersion: 3, services: [], groups: [] };
      if (!Array.isArray(cachedBackup.services)) cachedBackup.services = [];
      if (!Array.isArray(cachedBackup.groups)) cachedBackup.groups = [];
    }
    return cachedBackup;
  }

  // ---------- Vault status (sidebar) --------------------------------------
  async function refreshVaultStatus() {
    const node = $('#vault-status');
    if (!getApiKey()) { node.textContent = 'API key not set.'; return; }
    try {
      const b = await ensureBackup(true);
      node.innerHTML = (b.services.length + ' services<br>schema v' + (b.schemaVersion || '?'));
    } catch (e) {
      node.textContent = 'Disconnected: ' + e.message;
    }
  }

  // ---------- Browser-side OTP using OTPAuth ------------------------------
  const STEAM_ALPHABET = '23456789BCDFGHJKMNPQRTVWXY';
  function ensureLib() {
    if (typeof OTPAuth === 'undefined') throw new Error('OTPAuth library not loaded.');
    return OTPAuth;
  }
  function genTOTP(svc, ts) {
    const O = ensureLib();
    const t = new O.TOTP({
      issuer: '', label: '',
      secret: (svc.secret || '').replace(/\s+/g, '').toUpperCase(),
      algorithm: (svc.otp.algorithm || 'SHA1').toUpperCase().replace('SHA-', 'SHA'),
      digits: svc.otp.digits || 6,
      period: svc.otp.period || 30,
    });
    return t.generate({ timestamp: ts != null ? ts : Date.now() });
  }
  function genHOTP(svc, counter) {
    const O = ensureLib();
    const h = new O.HOTP({
      issuer: '', label: '',
      secret: (svc.secret || '').replace(/\s+/g, '').toUpperCase(),
      algorithm: (svc.otp.algorithm || 'SHA1').toUpperCase().replace('SHA-', 'SHA'),
      digits: svc.otp.digits || 6,
      counter: counter != null ? counter : (svc.otp.counter || 0),
    });
    return h.generate({ counter: counter != null ? counter : (svc.otp.counter || 0) });
  }
  function genSTEAM(svc, ts) {
    const O = ensureLib();
    const period = svc.otp.period || 30;
    const counter = Math.floor((ts != null ? ts : Date.now()) / 1000 / period);
    const h = new O.HOTP({
      issuer: '', label: '',
      secret: (svc.secret || '').replace(/\s+/g, '').toUpperCase(),
      algorithm: 'SHA1',
      digits: 10,
      counter: counter,
    });
    let v = parseInt(h.generate({ counter: counter }), 10);
    let out = '';
    for (let i = 0; i < 5; i += 1) {
      out += STEAM_ALPHABET.charAt(v % STEAM_ALPHABET.length);
      v = Math.floor(v / STEAM_ALPHABET.length);
    }
    return out;
  }
  function generateForService(svc, ts) {
    const type = (svc.otp.tokenType || 'TOTP').toUpperCase();
    if (type === 'HOTP') return genHOTP(svc);
    if (type === 'STEAM') return genSTEAM(svc, ts);
    return genTOTP(svc, ts);
  }
  function remainingSeconds(period) {
    const p = period || 30;
    return p - (Math.floor(Date.now() / 1000) % p);
  }

  // ---------- Modal --------------------------------------------------------
  const modalSlot = $('#modal-slot');
  function openModal(opts) {
    const overlay = el('div', { class: 'modal-overlay' });
    const dialog = el('div', { class: 'modal' + (opts.size === 'sm' ? ' modal-sm' : opts.size === 'lg' ? ' modal-lg' : '') });
    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', (e) => { if (e.target === overlay && !opts.persistent) close(); });

    const header = el('div', { class: 'modal-header' }, [
      el('h4', null, opts.title || ''),
      el('button', { class: 'modal-close', onclick: close, title: 'Close' }, [
        (function () {
          const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          s.setAttribute('width', '18'); s.setAttribute('height', '18');
          s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none');
          s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
          s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
          s.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';
          return s;
        }()),
      ]),
    ]);
    const body = el('div', { class: 'modal-body' });
    const bodyContent = typeof opts.body === 'function' ? opts.body(close) : opts.body;
    if (bodyContent) body.appendChild(bodyContent);
    const footer = el('div', { class: 'modal-footer' });
    const footerContent = typeof opts.footer === 'function' ? opts.footer(close) : opts.footer;
    if (Array.isArray(footerContent)) footerContent.forEach((c) => footer.appendChild(c));
    else if (footerContent) footer.appendChild(footerContent);

    dialog.appendChild(header);
    dialog.appendChild(body);
    if (footerContent) dialog.appendChild(footer);
    overlay.appendChild(dialog);
    modalSlot.appendChild(overlay);
    setTimeout(() => { const f = body.querySelector('input,textarea,select'); if (f) f.focus(); }, 50);
    return close;
  }

  // ---------- Service-row OTP renderer (re-used across views) -------------
  // Each cell registers itself with the global ticker so we can refresh codes
  // every second without rebuilding the DOM.
  const _tickers = new Set();
  function startTicker() {
    setInterval(() => {
      const now = Date.now();
      _tickers.forEach((fn) => { try { fn(now); } catch (_) {} });
      // also update topbar clock + countdown
      $('#topbar-time').textContent = new Date(now).toLocaleTimeString();
      const rem = 30 - (Math.floor(now / 1000) % 30);
      const fg = $('#countdown-fg');
      const total = 87.96; // 2*pi*14 ≈ 87.96
      fg.setAttribute('stroke-dashoffset', String(((30 - rem) / 30) * total));
      if (rem <= 5) fg.style.stroke = 'var(--falcon-warning)';
      else fg.style.stroke = 'var(--falcon-primary)';
    }, 1000);
  }
  function registerTicker(fn) {
    _tickers.add(fn);
    return () => _tickers.delete(fn);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => toast('Copied: ' + text, 'success'),
        () => fallbackCopy(text)
      );
    } else { fallbackCopy(text); }
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Copied: ' + text, 'success'); }
    catch (_) { toast('Could not copy automatically', 'warning'); }
    finally { ta.remove(); }
  }

  // Renders a TD (or two TDs) with the live OTP and progress bar.
  function renderOtpCell(svc, opts) {
    opts = opts || {};
    const masked = opts.masked != null ? opts.masked : true;
    const tokenType = (svc.otp.tokenType || 'TOTP').toUpperCase();

    const codeSpan = el('span', { class: 'otp-code' + (masked ? ' masked' : '') });
    let revealed = !masked;
    let lastCode = '';

    function rerender() {
      const code = generateForService(svc);
      lastCode = code;
      if (revealed) {
        codeSpan.textContent = code;
        codeSpan.classList.remove('masked');
      } else {
        codeSpan.textContent = '••••' + (code.length > 6 ? '••' : code.length === 5 ? '•' : '••');
        codeSpan.classList.add('masked');
      }
    }
    rerender();

    codeSpan.addEventListener('click', () => {
      if (!revealed) { revealed = true; rerender(); return; }
      copyText(lastCode);
    });
    codeSpan.title = 'Click to reveal / copy';

    // Progress bar
    const bar = el('div', { class: 'progress-bar' });
    const fill = el('div', { class: 'progress-bar-fill' });
    bar.appendChild(fill);

    function tick() {
      const rem = remainingSeconds(svc.otp.period || 30);
      const period = svc.otp.period || 30;
      const pct = (rem / period) * 100;
      fill.style.width = pct + '%';
      fill.classList.remove('warn', 'danger');
      if (rem <= 3) fill.classList.add('danger');
      else if (rem <= 7) fill.classList.add('warn');

      // Re-generate code at the boundary (when remaining flips back to period).
      if (rem === period) rerender();
    }
    tick();

    if (tokenType !== 'HOTP') {
      registerTicker(tick);
    } else {
      bar.style.visibility = 'hidden';
    }

    const wrap = el('div', { class: 'flex-row' }, [
      codeSpan,
      tokenType === 'HOTP' ? null : bar,
      el('button', {
        class: 'copy-btn', title: 'Copy', onclick: () => copyText(lastCode),
      }, [(function () {
        const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        s.setAttribute('width', '14'); s.setAttribute('height', '14');
        s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none');
        s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
        s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
        s.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>';
        return s;
      }())]),
      tokenType === 'HOTP' ? el('button', {
        class: 'btn btn-light btn-sm',
        onclick: async () => {
          const b = await ensureBackup();
          const target = b.services.find((s) => s === svc || (s.name === svc.name && s.otp && s.otp.label === svc.otp.label));
          if (!target) return;
          target.otp.counter = (target.otp.counter || 0) + 1;
          target.updatedAt = Date.now();
          try {
            await api.setBackup(b);
            rerender();
            toast('Counter advanced', 'success');
          } catch (e) { toast('Failed: ' + e.message, 'danger'); }
        },
      }, 'Next') : null,
    ]);

    return wrap;
  }

  function badgeForType(t) {
    const k = (t || 'TOTP').toUpperCase();
    if (k === 'HOTP') return el('span', { class: 'badge badge-warning' }, 'HOTP');
    if (k === 'STEAM') return el('span', { class: 'badge badge-info' }, 'STEAM');
    return el('span', { class: 'badge badge-primary' }, 'TOTP');
  }

  // ---------- Routing ------------------------------------------------------
  let currentRoute = 'dashboard';
  function navigate(route, force) {
    currentRoute = route || 'dashboard';
    $$('#sidebar-nav .sidebar-item').forEach((n) => {
      n.classList.toggle('active', n.dataset.route === currentRoute);
    });
    const slot = $('#content');
    slot.innerHTML = '';
    _tickers.clear();

    if (currentRoute === 'dashboard') return renderDashboard(slot);
    if (currentRoute === 'services') return renderServices(slot);
    if (currentRoute === 'backup') return renderBackup(slot);
    return renderDashboard(slot);
  }
  window.addEventListener('hashchange', () => {
    const r = (location.hash || '').replace(/^#/, '') || 'dashboard';
    navigate(r);
  });

  // =========================================================================
  // VIEW: Dashboard
  // =========================================================================
  async function renderDashboard(slot) {
    slot.appendChild(el('div', { class: 'page-header' }, [
      el('div', null, [
        el('h2', { class: 'page-title' }, 'Dashboard'),
        el('div', { class: 'page-subtitle' }, 'Live overview of your 2FA vault'),
      ]),
    ]));

    if (!getApiKey()) {
      slot.appendChild(el('div', { class: 'card' }, [
        el('div', { class: 'card-body empty-state' }, [
          el('h5', null, 'API key required'),
          el('div', null, 'Click "Set API key" in the topbar to connect.'),
        ]),
      ]));
      return;
    }

    const statGrid = el('div', { class: 'stat-grid' });
    statGrid.appendChild(makeStat('Total services', '…', 'primary', shieldIcon()));
    statGrid.appendChild(makeStat('TOTP', '…', 'success', clockIcon()));
    statGrid.appendChild(makeStat('HOTP', '…', 'warning', counterIcon()));
    statGrid.appendChild(makeStat('STEAM', '…', 'info', steamIcon()));
    slot.appendChild(statGrid);

    const tableCard = el('div', { class: 'card' }, [
      el('div', { class: 'card-header' }, [
        el('h4', null, 'Services'),
        el('a', { class: 'btn btn-light btn-sm', href: '#services' }, 'Manage →'),
      ]),
      el('div', { class: 'table-card', id: 'dashboard-table-wrap' }),
    ]);
    slot.appendChild(tableCard);

    let backup;
    try {
      backup = await ensureBackup(true);
    } catch (e) {
      toast('Failed to load backup: ' + e.message, 'danger');
      $('#dashboard-table-wrap').appendChild(el('div', { class: 'empty-state' }, [
        el('h5', null, 'Could not load backup'),
        el('div', null, e.message),
      ]));
      return;
    }
    const services = backup.services || [];
    const counts = { TOTP: 0, HOTP: 0, STEAM: 0 };
    services.forEach((s) => { const t = (s.otp && s.otp.tokenType || 'TOTP').toUpperCase(); counts[t] = (counts[t] || 0) + 1; });
    statGrid.replaceWith((function () {
      const g = el('div', { class: 'stat-grid' });
      g.appendChild(makeStat('Total services', String(services.length), 'primary', shieldIcon()));
      g.appendChild(makeStat('TOTP', String(counts.TOTP || 0), 'success', clockIcon()));
      g.appendChild(makeStat('HOTP', String(counts.HOTP || 0), 'warning', counterIcon()));
      g.appendChild(makeStat('STEAM', String(counts.STEAM || 0), 'info', steamIcon()));
      return g;
    })());

    const wrap = $('#dashboard-table-wrap');
    if (services.length === 0) {
      wrap.appendChild(el('div', { class: 'empty-state' }, [
        el('h5', null, 'No services yet'),
        el('div', null, 'Import a backup or add a service from the Services page.'),
      ]));
      return;
    }
    const table = el('table', { class: 'data-table' });
    const thead = el('thead', null, el('tr', null, [
      el('th', null, 'Name'), el('th', null, 'Issuer'), el('th', null, 'Account'),
      el('th', null, 'Type'), el('th', null, 'Current OTP'),
    ]));
    const tbody = el('tbody');
    services.forEach((svc) => {
      const tr = el('tr');
      tr.appendChild(el('td', { class: 'cell-primary' }, svc.name));
      tr.appendChild(el('td', null, svc.otp.issuer || '—'));
      tr.appendChild(el('td', null, svc.otp.account || svc.otp.label || '—'));
      tr.appendChild(el('td', null, badgeForType(svc.otp.tokenType)));
      tr.appendChild(el('td', null, renderOtpCell(svc, { masked: true })));
      tbody.appendChild(tr);
    });
    table.appendChild(thead); table.appendChild(tbody);
    wrap.appendChild(table);
  }

  function makeStat(title, value, kind, iconNode) {
    return el('div', { class: 'stat-card' }, [
      el('div', { class: 'stat-card-icon stat-card-icon-' + kind }, iconNode),
      el('div', { class: 'stat-card-title' }, title),
      el('div', { class: 'stat-card-value' }, value),
      el('div', { class: 'stat-card-sub' }, kind === 'primary' ? 'in your vault' :
        (kind === 'success' ? 'Time-based' : kind === 'warning' ? 'Counter-based' : 'Steam Guard')),
    ]);
  }
  function svgIcon(d, size) {
    size = size || 16;
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('width', size); s.setAttribute('height', size);
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.innerHTML = d;
    return s;
  }
  function shieldIcon()  { return svgIcon('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>'); }
  function clockIcon()   { return svgIcon('<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>'); }
  function counterIcon() { return svgIcon('<line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line>'); }
  function steamIcon()   { return svgIcon('<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle>'); }

  // =========================================================================
  // VIEW: Services
  // =========================================================================
  async function renderServices(slot) {
    slot.appendChild(el('div', { class: 'page-header' }, [
      el('div', null, [
        el('h2', { class: 'page-title' }, 'Services'),
        el('div', { class: 'page-subtitle' }, 'Manage your 2FA secrets'),
      ]),
      el('div', { class: 'flex-row' }, [
        el('input', { id: 'svc-search', class: 'input', placeholder: 'Search…', style: { width: '220px' } }),
        el('select', { id: 'svc-group', class: 'select', style: { width: '180px' } }),
        el('button', { class: 'btn btn-primary', onclick: () => openServiceModal(null) }, '+ Add service'),
      ]),
    ]));

    if (!getApiKey()) {
      slot.appendChild(el('div', { class: 'card' }, [
        el('div', { class: 'card-body empty-state' }, [
          el('h5', null, 'API key required'),
          el('div', null, 'Click "Set API key" in the topbar to connect.'),
        ]),
      ]));
      return;
    }

    const wrap = el('div', { class: 'table-card', id: 'svc-table-wrap' });
    slot.appendChild(wrap);

    let backup;
    try { backup = await ensureBackup(true); }
    catch (e) {
      toast('Failed to load backup: ' + e.message, 'danger');
      wrap.appendChild(el('div', { class: 'empty-state' }, [el('h5', null, 'Could not load'), el('div', null, e.message)]));
      return;
    }

    // populate group select
    const groupSel = $('#svc-group');
    groupSel.appendChild(el('option', { value: '' }, 'All groups'));
    groupSel.appendChild(el('option', { value: '__none__' }, 'Ungrouped'));
    (backup.groups || []).forEach((g) => groupSel.appendChild(el('option', { value: g.id }, g.name)));

    function refresh() {
      const q = ($('#svc-search').value || '').toLowerCase().trim();
      const grp = $('#svc-group').value;
      wrap.innerHTML = '';
      _tickers.clear();
      const filtered = (backup.services || []).filter((s) => {
        if (grp === '__none__' && s.groupId) return false;
        if (grp && grp !== '__none__' && s.groupId !== grp) return false;
        if (!q) return true;
        const hay = ((s.name || '') + ' ' + (s.otp.label || '') + ' ' + (s.otp.account || '') + ' ' + (s.otp.issuer || '')).toLowerCase();
        return hay.indexOf(q) !== -1;
      });
      if (filtered.length === 0) {
        wrap.appendChild(el('div', { class: 'empty-state' }, [el('h5', null, 'No matches')]));
        return;
      }
      const table = el('table', { class: 'data-table' });
      const thead = el('thead', null, el('tr', null, [
        el('th', null, 'Name'), el('th', null, 'Issuer'), el('th', null, 'Account'),
        el('th', null, 'Type'), el('th', null, 'Algo'), el('th', null, 'OTP'),
        el('th', null, ''),
      ]));
      const tbody = el('tbody');
      filtered.forEach((svc) => {
        const tr = el('tr');
        tr.appendChild(el('td', { class: 'cell-primary' }, svc.name));
        tr.appendChild(el('td', null, svc.otp.issuer || '—'));
        tr.appendChild(el('td', null, svc.otp.account || svc.otp.label || '—'));
        tr.appendChild(el('td', null, badgeForType(svc.otp.tokenType)));
        tr.appendChild(el('td', null, el('span', { class: 'cell-muted text-mono' }, svc.otp.algorithm || 'SHA1')));
        tr.appendChild(el('td', null, renderOtpCell(svc, { masked: true })));
        tr.appendChild(el('td', null, el('div', { class: 'row-actions' }, [
          el('button', { class: 'btn btn-light btn-sm', onclick: () => openServiceModal(svc) }, 'Edit'),
          el('button', { class: 'btn btn-light btn-sm', onclick: () => openDeleteModal(svc) }, 'Delete'),
        ])));
        tbody.appendChild(tr);
      });
      table.appendChild(thead); table.appendChild(tbody);
      wrap.appendChild(table);
    }
    refresh();
    $('#svc-search').addEventListener('input', refresh);
    $('#svc-group').addEventListener('change', refresh);

    // Save helper used by both add/edit modals.
    async function persist() {
      try {
        await api.setBackup(backup);
        toast('Saved.', 'success');
        refreshVaultStatus();
      } catch (e) { toast('Save failed: ' + e.message, 'danger'); throw e; }
    }

    function openServiceModal(svc) {
      const isEdit = !!svc;
      openModal({
        size: 'default',
        title: isEdit ? 'Edit service' : 'Add service',
        body: () => {
          const v = svc || { name: '', secret: '', otp: { tokenType: 'TOTP', algorithm: 'SHA1', digits: 6, period: 30 } };
          const wrap = el('div');
          wrap.appendChild(el('div', { class: 'form-grid-2' }, [
            formField('Name', el('input', { class: 'input', id: 'f-name', value: v.name || '' })),
            formField('Issuer', el('input', { class: 'input', id: 'f-issuer', value: v.otp.issuer || '' })),
          ]));
          wrap.appendChild(el('div', { class: 'form-grid-2' }, [
            formField('Label', el('input', { class: 'input', id: 'f-label', value: v.otp.label || '' })),
            formField('Account', el('input', { class: 'input', id: 'f-account', value: v.otp.account || '' })),
          ]));
          wrap.appendChild(formField('Secret (Base32)',
            el('input', { class: 'input', id: 'f-secret', value: v.secret || '', placeholder: 'JBSWY3DPEHPK3PXP' })));
          wrap.appendChild(el('div', { class: 'form-grid-2' }, [
            formField('Type', (function () {
              const sel = el('select', { class: 'select', id: 'f-type' });
              ['TOTP', 'HOTP', 'STEAM'].forEach((t) => sel.appendChild(el('option', { value: t, selected: v.otp.tokenType === t }, t)));
              return sel;
            })()),
            formField('Algorithm', (function () {
              const sel = el('select', { class: 'select', id: 'f-algo' });
              ['SHA1', 'SHA256', 'SHA512'].forEach((a) => sel.appendChild(el('option', { value: a, selected: (v.otp.algorithm || 'SHA1') === a }, a)));
              return sel;
            })()),
          ]));
          wrap.appendChild(el('div', { class: 'form-grid-2' }, [
            formField('Digits', el('input', { class: 'input', type: 'number', id: 'f-digits', value: String(v.otp.digits || 6), min: '4', max: '10' })),
            formField('Period (TOTP/STEAM) or Counter (HOTP)',
              el('input', { class: 'input', type: 'number', id: 'f-period', value: String(v.otp.period || v.otp.counter || 30) })),
          ]));
          wrap.appendChild(formField('Group', (function () {
            const sel = el('select', { class: 'select', id: 'f-group' });
            sel.appendChild(el('option', { value: '' }, 'Ungrouped'));
            (backup.groups || []).forEach((g) => sel.appendChild(el('option', { value: g.id, selected: v.groupId === g.id }, g.name)));
            return sel;
          })()));
          return wrap;
        },
        footer: (close) => [
          el('button', { class: 'btn btn-light', onclick: close }, 'Cancel'),
          el('button', {
            class: 'btn btn-primary',
            onclick: async () => {
              const name = $('#f-name').value.trim();
              const secret = $('#f-secret').value.trim();
              if (!name || !secret) { toast('Name and secret are required.', 'warning'); return; }
              const type = $('#f-type').value;
              const algo = $('#f-algo').value;
              const digits = parseInt($('#f-digits').value, 10) || 6;
              const periodOrCounter = parseInt($('#f-period').value, 10) || (type === 'HOTP' ? 0 : 30);
              const groupId = $('#f-group').value || null;
              const now = Date.now();
              const next = {
                name: name,
                secret: secret,
                updatedAt: now,
                groupId: groupId,
                otp: {
                  label: $('#f-label').value.trim() || $('#f-account').value.trim() || name,
                  account: $('#f-account').value.trim() || $('#f-label').value.trim() || name,
                  issuer: $('#f-issuer').value.trim() || '',
                  digits: digits,
                  algorithm: algo,
                  tokenType: type,
                  source: 'Manual',
                  link: null,
                },
                order: { position: (backup.services || []).length },
                icon: { selected: 'Label', label: { text: name.slice(0, 2).toUpperCase(), backgroundColor: 'LightBlue' }, iconCollection: { id: '' } },
              };
              if (type === 'HOTP') next.otp.counter = periodOrCounter;
              else next.otp.period = periodOrCounter;

              if (isEdit) {
                const idx = backup.services.indexOf(svc);
                if (idx >= 0) {
                  // preserve order/icon if present
                  next.order = svc.order || next.order;
                  next.icon = svc.icon || next.icon;
                  backup.services[idx] = next;
                }
              } else {
                backup.services.push(next);
              }
              try { await persist(); close(); refresh(); }
              catch (_) {}
            },
          }, isEdit ? 'Save' : 'Add'),
        ],
      });
    }

    function openDeleteModal(svc) {
      openModal({
        size: 'sm',
        title: 'Delete service',
        body: () => el('div', null, [
          el('p', null, 'Are you sure you want to delete '),
          el('strong', null, svc.name),
          el('span', null, '? This cannot be undone.'),
        ]),
        footer: (close) => [
          el('button', { class: 'btn btn-light', onclick: close }, 'Cancel'),
          el('button', {
            class: 'btn btn-danger',
            onclick: async () => {
              const idx = backup.services.indexOf(svc);
              if (idx >= 0) backup.services.splice(idx, 1);
              try { await persist(); close(); refresh(); }
              catch (_) {}
            },
          }, 'Delete'),
        ],
      });
    }
  }
  function formField(label, inputNode) {
    return el('div', { class: 'form-group' }, [
      el('label', { class: 'form-label' }, label),
      inputNode,
    ]);
  }

  // =========================================================================
  // VIEW: Backup
  // =========================================================================
  async function renderBackup(slot) {
    slot.appendChild(el('div', { class: 'page-header' }, [
      el('div', null, [
        el('h2', { class: 'page-title' }, 'Backup / Import'),
        el('div', { class: 'page-subtitle' }, 'Upload a 2FAS backup file or download the current vault'),
      ]),
    ]));

    if (!getApiKey()) {
      slot.appendChild(el('div', { class: 'card' }, [
        el('div', { class: 'card-body empty-state' }, [
          el('h5', null, 'API key required'),
        ]),
      ]));
      return;
    }

    const grid = el('div', { class: 'stat-grid', style: { gridTemplateColumns: 'repeat(2, 1fr)' } });

    // Import card
    const importCard = el('div', { class: 'card' }, [
      el('div', { class: 'card-header' }, el('h4', null, 'Import backup')),
      el('div', { class: 'card-body' }, [
        (function () {
          const dz = el('div', { class: 'dropzone', id: 'dropzone' }, [
            el('h5', null, 'Drag & drop a .json file here'),
            el('div', null, 'or'),
            el('div', { class: 'mt-2' }, el('label', { class: 'btn btn-secondary', for: 'file-input' }, 'Choose file')),
            el('input', { class: 'file-input', id: 'file-input', type: 'file', accept: 'application/json,.json' }),
            el('div', { class: 'mt-2 form-helper', id: 'file-name' }, ''),
          ]);
          return dz;
        })(),
        el('div', { id: 'import-preview', style: { marginTop: 'var(--falcon-space-4)' } }),
      ]),
    ]);

    // Export card
    const exportCard = el('div', { class: 'card' }, [
      el('div', { class: 'card-header' }, el('h4', null, 'Download current backup')),
      el('div', { class: 'card-body' }, [
        el('p', { class: 'muted' }, 'Saves the entire vault as a 2fas-backup.json file.'),
        el('button', {
          class: 'btn btn-primary',
          onclick: async () => {
            try {
              const data = await api.getBackup();
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = el('a', { href: url, download: '2fas-backup-' + new Date().toISOString().slice(0, 10) + '.json' });
              document.body.appendChild(a); a.click(); a.remove();
              URL.revokeObjectURL(url);
              toast('Backup downloaded.', 'success');
            } catch (e) { toast('Download failed: ' + e.message, 'danger'); }
          },
        }, 'Download backup'),
      ]),
    ]);

    grid.appendChild(importCard); grid.appendChild(exportCard);
    slot.appendChild(grid);

    // dropzone behavior
    const dz = $('#dropzone');
    const fileInput = $('#file-input');
    let pending = null;

    function setPending(json, name) {
      pending = json;
      $('#file-name').textContent = name + ' — ' + (json.services ? json.services.length : 0) + ' services, schema v' + (json.schemaVersion || '?');
      const preview = $('#import-preview');
      preview.innerHTML = '';
      preview.appendChild(el('div', { class: 'flex-row' }, [
        el('button', {
          class: 'btn btn-success',
          onclick: async () => {
            try {
              const r = await api.setBackup(pending);
              toast('Imported ' + (r && r.count != null ? r.count : '?') + ' services.', 'success');
              cachedBackup = null;
              refreshVaultStatus();
              navigate('services', true);
            } catch (e) { toast('Import failed: ' + e.message, 'danger'); }
          },
        }, 'Confirm import'),
        el('button', { class: 'btn btn-light', onclick: () => { pending = null; preview.innerHTML = ''; $('#file-name').textContent = ''; fileInput.value = ''; } }, 'Cancel'),
      ]));
    }

    function readFile(file) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const json = JSON.parse(reader.result);
          if (typeof json.schemaVersion === 'undefined') {
            toast('File missing schemaVersion.', 'warning'); return;
          }
          setPending(json, file.name);
        } catch (e) { toast('Could not parse JSON: ' + e.message, 'danger'); }
      };
      reader.readAsText(file);
    }

    fileInput.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0]; if (f) readFile(f);
    });
    ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('is-drag'); }));
    ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('is-drag'); }));
    dz.addEventListener('drop', (e) => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) readFile(f);
    });
  }

  // =========================================================================
  // Topbar live search
  // =========================================================================
  const searchInput = $('#topbar-search');
  const searchResults = $('#search-results');
  let searchTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = searchInput.value.trim();
    if (!q) { searchResults.style.display = 'none'; return; }
    if (!getApiKey()) { searchResults.style.display = 'none'; return; }
    searchTimer = setTimeout(async () => {
      try {
        const r = await api.searchOtp(q);
        renderSearchResults(r.results || []);
      } catch (e) {
        renderSearchResults([], e);
      }
    }, 250);
  });
  searchInput.addEventListener('blur', () => setTimeout(() => { searchResults.style.display = 'none'; }, 150));
  searchInput.addEventListener('focus', () => { if (searchInput.value.trim()) searchResults.style.display = 'block'; });

  function renderSearchResults(items, err) {
    searchResults.innerHTML = '';
    if (err) {
      searchResults.appendChild(el('div', { class: 'search-result-item' }, [
        el('div', { class: 'meta' }, 'Search failed: ' + err.message),
      ]));
    } else if (items.length === 0) {
      searchResults.appendChild(el('div', { class: 'search-result-item' }, [
        el('div', { class: 'meta' }, 'No matches'),
      ]));
    } else {
      items.forEach((it) => {
        const row = el('div', { class: 'search-result-item' }, [
          el('div', { class: 'name-row' }, [
            el('span', { class: 'name' }, it.name),
            badgeForType(it.tokenType),
            el('span', { class: 'meta' }, '· tier ' + it.tier),
          ]),
          el('div', { class: 'flex-row' }, [
            el('span', { class: 'otp-code', onclick: () => copyText(it.current) }, it.current),
            el('span', { class: 'meta' }, it.label || it.issuer || ''),
            el('span', { class: 'right meta' }, it.tokenType === 'HOTP' ? ('counter ' + it.counter) : ('next: ' + it.next)),
          ]),
        ]);
        searchResults.appendChild(row);
      });
    }
    searchResults.style.display = 'block';
  }

  // ---------- Boot ---------------------------------------------------------
  refreshApiKeyBtn();
  startTicker();
  // initial route
  const initial = (location.hash || '').replace(/^#/, '') || 'dashboard';
  if (!location.hash) location.hash = '#dashboard';
  navigate(initial);
  refreshVaultStatus();
})();
