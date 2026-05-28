---

version: alpha

name: Falcon Dashboard

description: >

 Admin dashboard design system based on Falcon v3 by Prium/ThemeWagon.

 Clean corporate aesthetic with a deep navy sidebar, electric-blue primary

 accent, and a cool-gray content surface. Optimised for data-heavy

 management interfaces, hospital/ERP systems, and SaaS back-offices.



colors:

 # --- Brand ---

 primary:          "#2c7be5"

 primary-light:    "#d5e5fa"

 primary-dark:     "#1a68c8"



 # --- Semantic ---

 success:          "#00d27a"

 success-light:    "#ccf6e4"

 success-dark:     "#00864e"



 warning:          "#f5803e"

 warning-light:    "#fde6d8"

 warning-dark:     "#c45111"



 danger:           "#e63757"

 danger-light:     "#fce8eb"

 danger-dark:      "#c0002e"



 info:             "#27bcfd"

 info-light:       "#d5f0fe"

 info-dark:        "#0084b0"



 # --- Neutrals ---

 dark:             "#0b1727"

 text:             "#344050"

 muted:            "#748194"

 border:           "#d8e2ef"

 border-light:     "#edf2f9"



 # --- Surfaces ---

 surface:          "#ffffff"

 surface-body:     "#edf2f9"

 surface-sidebar:  "#0b1727"

 surface-hover:    "#f9fbfd"

 surface-input:    "#ffffff"



 # --- Sidebar text ---

 sidebar-text:     "#9da9bb"

 sidebar-hover:    "rgba(255,255,255,0.08)"

 sidebar-active:   "rgba(44,123,229,0.15)"



typography:

 h1:

   fontFamily: Poppins

   fontSize: 2rem

   fontWeight: 700

   lineHeight: 1.2

   letterSpacing: "-0.02em"



 h2:

   fontFamily: Poppins

   fontSize: 1.75rem

   fontWeight: 700

   lineHeight: 1.25



 h3:

   fontFamily: Poppins

   fontSize: 1.25rem

   fontWeight: 600

   lineHeight: 1.3



 h4:

   fontFamily: Poppins

   fontSize: 1rem

   fontWeight: 600

   lineHeight: 1.4



 h5:

   fontFamily: Poppins

   fontSize: 0.875rem

   fontWeight: 600

   lineHeight: 1.4



 body-lg:

   fontFamily: Poppins

   fontSize: 1rem

   fontWeight: 400

   lineHeight: 1.6



 body-md:

   fontFamily: Poppins

   fontSize: 0.875rem

   fontWeight: 400

   lineHeight: 1.6



 body-sm:

   fontFamily: Poppins

   fontSize: 0.8125rem

   fontWeight: 400

   lineHeight: 1.5



 caption:

   fontFamily: Poppins

   fontSize: 0.75rem

   fontWeight: 400

   lineHeight: 1.4



 label-caps:

   fontFamily: Poppins

   fontSize: 0.6875rem

   fontWeight: 700

   lineHeight: 1.4

   letterSpacing: "0.08em"

   # Always rendered UPPERCASE



 sidebar-item:

   fontFamily: Poppins

   fontSize: 0.8125rem

   fontWeight: 500

   lineHeight: 1.4



 sidebar-section:

   fontFamily: Poppins

   fontSize: 0.625rem

   fontWeight: 700

   letterSpacing: "0.10em"

   # Always UPPERCASE, color: sidebar-text dimmed



 mono:

   fontFamily: "SFMono-Regular, Consolas, Liberation Mono, monospace"

   fontSize: 0.8125rem

   fontWeight: 400



rounded:

 none: 0px

 sm:   4px

 md:   6px

 lg:   8px

 xl:   12px

 2xl:  16px

 full: 9999px



spacing:

 0:    0px

 1:    4px

 2:    8px

 3:    12px

 4:    16px

 5:    20px

 6:    24px

 8:    32px

 10:   40px

 12:   48px

 16:   64px

 20:   80px



components:

 # ── BUTTONS ──────────────────────────────────────────────

 button-primary:

   backgroundColor: "{colors.primary}"

   textColor:       "{colors.surface}"

   typography:      "{typography.body-sm}"

   rounded:         "{rounded.md}"

   padding:         "8px 16px"



 button-primary-hover:

   backgroundColor: "{colors.primary-dark}"



 button-secondary:

   backgroundColor: "{colors.surface}"

   textColor:       "{colors.primary}"

   rounded:         "{rounded.md}"

   padding:         "7px 16px"

   # border: 1px solid {colors.primary}



 button-secondary-hover:

   backgroundColor: "{colors.primary-light}"



 button-light:

   backgroundColor: "{colors.surface-body}"

   textColor:       "{colors.muted}"

   rounded:         "{rounded.md}"

   padding:         "7px 14px"

   # border: 1px solid {colors.border}



 button-light-hover:

   backgroundColor: "{colors.border}"



 button-danger:

   backgroundColor: "{colors.danger}"

   textColor:       "{colors.surface}"

   rounded:         "{rounded.md}"

   padding:         "8px 16px"



 button-danger-hover:

   backgroundColor: "{colors.danger-dark}"



 button-success:

   backgroundColor: "{colors.success}"

   textColor:       "{colors.surface}"

   rounded:         "{rounded.md}"

   padding:         "8px 16px"



 # ── INPUTS & FORM ELEMENTS ───────────────────────────────

 input:

   backgroundColor: "{colors.surface-input}"

   textColor:       "{colors.text}"

   rounded:         "{rounded.md}"

   padding:         "8px 12px"

   height:          "36px"

   # border: 1px solid {colors.border}

   # font: {typography.body-sm}

   # placeholder color: {colors.muted}



 input-focus:

   # border-color: {colors.primary}

   # box-shadow: 0 0 0 3px {colors.primary-light}

   # outline: none



 input-error:

   # border-color: {colors.danger}

   # box-shadow: 0 0 0 3px {colors.danger-light}



 input-disabled:

   backgroundColor: "{colors.surface-body}"

   textColor:       "{colors.muted}"

   # cursor: not-allowed



 select:

   backgroundColor: "{colors.surface-input}"

   textColor:       "{colors.text}"

   rounded:         "{rounded.md}"

   padding:         "8px 36px 8px 12px"

   height:          "36px"

   # Same border rules as input

   # Chevron icon: {colors.muted}, absolute right: 12px



 textarea:

   backgroundColor: "{colors.surface-input}"

   textColor:       "{colors.text}"

   rounded:         "{rounded.lg}"

   padding:         "10px 12px"

   # min-height: 80px; resize: vertical



 form-label:

   textColor:       "{colors.text}"

   typography:      "{typography.body-sm}"

   # fontWeight: 600; margin-bottom: 4px



 form-helper:

   textColor:       "{colors.muted}"

   typography:      "{typography.caption}"



 form-error-text:

   textColor:       "{colors.danger}"

   typography:      "{typography.caption}"



 checkbox:

   # width/height: 16px; border-radius: {rounded.sm}

   # border: 1.5px solid {colors.border}

   # checked: background {colors.primary}, checkmark white



 radio:

   # width/height: 16px; border-radius: {rounded.full}

   # checked: inner dot {colors.primary}



 # ── CARDS ────────────────────────────────────────────────

 card:

   backgroundColor: "{colors.surface}"

   rounded:         "{rounded.lg}"

   padding:         "20px 24px"

   # box-shadow: 0 7px 14px 0 rgba(65,69,88,0.10), 0 3px 6px 0 rgba(0,0,0,0.07)

   # border: none (shadow only)



 card-header:

   # padding: 16px 20px; border-bottom: 1px solid {colors.border}

   # font: {typography.h4}



 card-footer:

   # padding: 12px 20px; border-top: 1px solid {colors.border}

   backgroundColor: "{colors.surface-body}"



 stat-card:

   backgroundColor: "{colors.surface}"

   rounded:         "{rounded.lg}"

   padding:         "20px 24px"

   # Inherits card shadow

   # icon-circle: 32px, border-radius full, background = color + "1a" (10% opacity)



 # ── BADGES & PILLS ───────────────────────────────────────

 badge-success:

   backgroundColor: "{colors.success-light}"

   textColor:       "{colors.success-dark}"

   rounded:         "{rounded.sm}"

   padding:         "3px 10px"

   typography:      "{typography.label-caps}"



 badge-warning:

   backgroundColor: "{colors.warning-light}"

   textColor:       "{colors.warning-dark}"

   rounded:         "{rounded.sm}"

   padding:         "3px 10px"

   typography:      "{typography.label-caps}"



 badge-danger:

   backgroundColor: "{colors.danger-light}"

   textColor:       "{colors.danger-dark}"

   rounded:         "{rounded.sm}"

   padding:         "3px 10px"

   typography:      "{typography.label-caps}"



 badge-primary:

   backgroundColor: "{colors.primary-light}"

   textColor:       "{colors.primary-dark}"

   rounded:         "{rounded.sm}"

   padding:         "3px 10px"

   typography:      "{typography.label-caps}"



 badge-info:

   backgroundColor: "{colors.info-light}"

   textColor:       "{colors.info-dark}"

   rounded:         "{rounded.sm}"

   padding:         "3px 10px"

   typography:      "{typography.label-caps}"



 # ── TABLES ───────────────────────────────────────────────

 table:

   backgroundColor: "{colors.surface}"

   # border-radius: {rounded.lg}

   # overflow: hidden; box-shadow: card shadow



 table-header:

   backgroundColor: "{colors.surface-body}"

   textColor:       "{colors.muted}"

   typography:      "{typography.label-caps}"

   # padding: 10px 16px; text-transform: uppercase



 table-row:

   textColor:       "{colors.text}"

   typography:      "{typography.body-sm}"

   # padding: 12px 16px; border-bottom: 1px solid {colors.border}



 table-row-hover:

   backgroundColor: "{colors.surface-hover}"



 # ── SIDEBAR ──────────────────────────────────────────────

 sidebar:

   backgroundColor: "{colors.surface-sidebar}"

   width:           "300px"

   # border-right: none; overflow-y: auto



 sidebar-logo:

   # padding: 24px 20px 16px

   # border-bottom: 1px solid rgba(255,255,255,0.08)



 sidebar-section-label:

   textColor:       "#6e7d9a"

   typography:      "{typography.sidebar-section}"

   # padding: 20px 24px 8px; uppercase



 sidebar-item:

   textColor:       "{colors.sidebar-text}"

   typography:      "{typography.sidebar-item}"

   rounded:         "{rounded.md}"

   padding:         "10px 16px"

   # margin: 2px 8px



 sidebar-item-hover:

   backgroundColor: "{colors.sidebar-hover}"



 sidebar-item-active:

   backgroundColor: "{colors.sidebar-active}"

   textColor:       "{colors.primary}"



 sidebar-child-item:

   textColor:       "{colors.sidebar-text}"

   typography:      "{typography.caption}"

   # padding: 7px 16px; margin: 1px 8px; padding-left: 40px (indent)



 # ── TOPBAR ───────────────────────────────────────────────

 topbar:

   backgroundColor: "{colors.surface}"

   height:          "60px"

   # border-bottom: 1px solid {colors.border}

   # padding: 0 24px; z-index: 100



 topbar-search:

   backgroundColor: "{colors.surface-body}"

   rounded:         "{rounded.md}"

   padding:         "7px 12px"

   # border: 1px solid {colors.border}

   # max-width: 360px; icon: Search 14px {colors.muted}



 topbar-icon-btn:

   textColor:       "{colors.muted}"

   # width/height: 36px; border-radius: full; hover: background {colors.surface-body}



 topbar-avatar:

   # width/height: 32px; border-radius: full

   # initials bg: {colors.primary-light}, text: {colors.primary}



 # ── NOTIFICATIONS PANEL ──────────────────────────────────

 notification-panel:

   backgroundColor: "{colors.surface}"

   rounded:         "{rounded.lg}"

   # width: 300px; box-shadow: 0 8px 24px rgba(0,0,0,0.12)

   # border: 1px solid {colors.border}; z-index: 200



 notification-item:

   textColor:       "{colors.text}"

   typography:      "{typography.body-sm}"

   padding:         "10px 16px"

   # border-bottom: 1px solid {colors.border}



 notification-item-hover:

   backgroundColor: "{colors.surface-body}"



 notification-badge:

   backgroundColor: "{colors.danger}"

   textColor:       "{colors.surface}"

   # width/height: 16px; border-radius: full; font-size: 9px; font-weight: 700

   # position: absolute top -6px right -6px



 # ── MODALS / DIALOGS ─────────────────────────────────────

 modal-overlay:

   # background: rgba(11,23,39,0.5); position: fixed inset-0; z-index: 1000



 modal:

   backgroundColor: "{colors.surface}"

   rounded:         "{rounded.xl}"

   padding:         "0"

   # width: 520px (default); max-width: 90vw

   # box-shadow: 0 20px 60px rgba(0,0,0,0.20)

   # animation: fade-in + slide-up 200ms ease



 modal-header:

   textColor:       "{colors.text}"

   typography:      "{typography.h4}"

   padding:         "20px 24px"

   # border-bottom: 1px solid {colors.border}

   # Close button: X icon 20px, color {colors.muted}, top-right absolute



 modal-body:

   padding:         "20px 24px"

   textColor:       "{colors.text}"

   typography:      "{typography.body-md}"



 modal-footer:

   padding:         "16px 24px"

   # border-top: 1px solid {colors.border}

   # display: flex; justify-content: flex-end; gap: 8px



 modal-sm:

   width:           "400px"



 modal-lg:

   width:           "720px"



 modal-xl:

   width:           "960px"



 # ── TOASTS / ALERTS ──────────────────────────────────────

 toast:

   backgroundColor: "{colors.dark}"

   textColor:       "{colors.surface}"

   rounded:         "{rounded.lg}"

   padding:         "14px 18px"

   # min-width: 280px; box-shadow: 0 8px 20px rgba(0,0,0,0.15)

   # position: fixed bottom-right; z-index: 1100

   # animation: slide-in-right 250ms ease



 toast-success:

   # left-border: 3px solid {colors.success}; icon: CheckCircle {colors.success}



 toast-warning:

   # left-border: 3px solid {colors.warning}; icon: AlertTriangle {colors.warning}



 toast-danger:

   # left-border: 3px solid {colors.danger}; icon: XCircle {colors.danger}



 toast-info:

   # left-border: 3px solid {colors.info}; icon: Info {colors.info}



 alert-success:

   backgroundColor: "{colors.success-light}"

   textColor:       "{colors.success-dark}"

   rounded:         "{rounded.md}"

   padding:         "12px 16px"

   # border-left: 4px solid {colors.success}



 alert-warning:

   backgroundColor: "{colors.warning-light}"

   textColor:       "{colors.warning-dark}"

   rounded:         "{rounded.md}"

   padding:         "12px 16px"

   # border-left: 4px solid {colors.warning}



 alert-danger:

   backgroundColor: "{colors.danger-light}"

   textColor:       "{colors.danger-dark}"

   rounded:         "{rounded.md}"

   padding:         "12px 16px"

   # border-left: 4px solid {colors.danger}



 alert-info:

   backgroundColor: "{colors.info-light}"

   textColor:       "{colors.info-dark}"

   rounded:         "{rounded.md}"

   padding:         "12px 16px"

   # border-left: 4px solid {colors.info}



 # ── DROPDOWNS ────────────────────────────────────────────

 dropdown:

   backgroundColor: "{colors.surface}"

   rounded:         "{rounded.lg}"

   # min-width: 180px; box-shadow: 0 8px 24px rgba(0,0,0,0.12)

   # border: 1px solid {colors.border}; z-index: 200

   # padding: 4px 0



 dropdown-item:

   textColor:       "{colors.text}"

   typography:      "{typography.body-sm}"

   padding:         "9px 16px"



 dropdown-item-hover:

   backgroundColor: "{colors.surface-body}"



 dropdown-divider:

   # height: 1px; background: {colors.border}; margin: 4px 0



 dropdown-header:

   textColor:       "{colors.muted}"

   typography:      "{typography.label-caps}"

   padding:         "8px 16px 4px"



 # ── PROGRESS & LOADING ───────────────────────────────────

 progress-bar:

   backgroundColor: "{colors.border}"

   rounded:         "{rounded.full}"

   height:          "4px"

   # fill: {colors.primary}; transition: width 400ms ease



 avatar:

   # border-radius: {rounded.full}

   # sizes: sm=24px, md=32px, lg=40px, xl=48px

   # border: 2px solid {colors.surface} (when stacked)



 # ── NAVIGATION TABS ──────────────────────────────────────

 tab-item:

   textColor:       "{colors.muted}"

   typography:      "{typography.body-sm}"

   padding:         "10px 16px"

   # border-bottom: 2px solid transparent



 tab-item-active:

   textColor:       "{colors.primary}"

   # border-bottom-color: {colors.primary}



 tab-item-hover:

   textColor:       "{colors.text}"

   backgroundColor: "{colors.surface-body}"



 # ── BREADCRUMB ───────────────────────────────────────────

 breadcrumb:

   textColor:       "{colors.muted}"

   typography:      "{typography.caption}"

   # active item: {colors.primary}; separator: ChevronRight 12px



 # ── PAGE HEADER ──────────────────────────────────────────

 page-header:

   # margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center



 page-title:

   textColor:       "{colors.text}"

   typography:      "{typography.h3}"



---

## Overview

Falcon Dashboard follows a **Corporate Precision** aesthetic: information-dense yet uncluttered, with authority conveyed through clean hierarchy rather than decoration. The deep navy sidebar (`#0b1727`) grounds the layout and anchors the user's spatial orientation. The body surface (`#edf2f9`) is a cool off-white that reduces eye strain in prolonged use. A single electric-blue primary (`#2c7be5`) drives all interactive affordances.

**Target contexts:** hospital information systems, ERP/admin panels, SaaS back-offices, analytics dashboards, data management tools.

**Personality:** Professional, trustworthy, efficient, data-friendly. Never playful. Minimal animation — only functional transitions.

**Core principle:** Typography and spacing do the heavy lifting. Components never compete for attention; only data does.

---

## Colors

The palette is split into three groups. Agents must never invent new colors outside these groups.

### Brand

- **Primary (`#2c7be5`)** — All interactive elements: links, focused inputs, active nav items, primary buttons, chart highlights.

- **Primary Light (`#d5e5fa`)** — Focus rings, active backgrounds in lists, avatar background.

- **Primary Dark (`#1a68c8`)** — Button hover, pressed states.

### Semantic (status colors)

Each semantic color has three variants: base, light (backgrounds), dark (text on light background). Use them in pairs: `danger-light` background with `danger-dark` text; never `danger` base as text on white — it fails WCAG AA.

| Intent | Base | Light (bg) | Dark (text) |

|--------|------|-----------|-------------|

| Success | `#00d27a` | `#ccf6e4` | `#00864e` |

| Warning | `#f5803e` | `#fde6d8` | `#c45111` |

| Danger  | `#e63757` | `#fce8eb` | `#c0002e` |

| Info    | `#27bcfd` | `#d5f0fe` | `#0084b0` |

### Neutrals & Surfaces

- **Text (`#344050`)** — All body copy, headings in content area.

- **Muted (`#748194`)** — Secondary text, placeholders, icons, metadata.

- **Border (`#d8e2ef`)** — All borders: inputs, cards, table rows, dividers.

- **Surface (`#ffffff`)** — Cards, modals, dropdowns, inputs.

- **Surface Body (`#edf2f9`)** — Page background, table headers, disabled inputs.

- **Surface Sidebar (`#0b1727`)** — Sidebar background only.

- **Sidebar Text (`#9da9bb`)** — Inactive sidebar links and section labels.

---

## Typography

**Font:** Poppins (Google Fonts). Load weights 300, 400, 500, 600, 700. Always specify the full stack: `'Poppins', system-ui, -apple-system, sans-serif`.

### Scale usage rules

- `h1`–`h2`: Page-level titles only (rare in dashboards). Weight 700.

- `h3`–`h4`: Card headings, modal titles, section headings. Weight 600.

- `h5`: Sub-section headings, sidebar group labels. Weight 600.

- `body-md` (0.875rem / 400): Default reading size — table cells, form labels, list items.

- `body-sm` (0.8125rem / 400): Secondary info, dropdown items, button labels.

- `caption` (0.75rem / 400): Helper text, timestamps, metadata below primary content.

- `label-caps` (0.6875rem / 700 / UPPERCASE / 0.08em tracking): Table column headers, badge text, section labels. **Always uppercase.** Never use for body content.

- `sidebar-item` (0.8125rem / 500): Nav link labels.

- `sidebar-section` (0.625rem / 700 / UPPERCASE / 0.10em tracking): Group headings inside sidebar (e.g. "Main Menu"). Color: `#6e7d9a`.

### Prohibitions

- Never use font sizes below 0.625rem (10px).

- Never mix Poppins with serif fonts in the same component.

- `label-caps` must always be `text-transform: uppercase` — never manually uppercased in content.

---

## Layout & Spacing

### Page shell

```

+--[Sidebar 300px]--+--[Main column flex-1]--+

|                   | [Topbar 60px]          |

|  dark navy        +------------------------+

|                   | [Content area]         |

|                   | padding: 24px 28px     |

+-------------------+------------------------+

```

- **Sidebar width:** 300px (collapsed: 0px, toggle with CSS transition `width 0.25s ease`).

- **Topbar height:** 60px, sticky, `z-index: 100`, `border-bottom: 1px solid #d8e2ef`.

- **Content padding:** 24px top/bottom, 28px left/right.

- **Content max-width:** none — full width inside available area.

- **Card grid:** CSS Grid, `gap: 16px–20px`. Stat cards: `repeat(4, 1fr)`. Break to 2-col below 1024px, 1-col below 640px.

### Spacing scale

Use the token spacing scale exclusively (4px base). Common patterns:

- Component internal padding: `spacing.2` (8px) – `spacing.6` (24px).

- Between cards / sections: `spacing.4` (16px) – `spacing.5` (20px).

- Between label and input: `spacing.1` (4px).

- Between form groups: `spacing.4` (16px).

- Page section gap: `spacing.6` (24px).

### Breakpoints (informational)

- Mobile: < 640px

- Tablet: 640px – 1023px

- Desktop: ≥ 1024px

- Sidebar collapses automatically on mobile.

---

## Elevation & Depth

Falcon uses **shadow-only elevation** — no solid card borders. Use exactly one of these three levels:

| Level | Usage | CSS |

|-------|-------|-----|

| **Raised** (cards, dropdowns) | All cards, stat panels | `0 7px 14px 0 rgba(65,69,88,.10), 0 3px 6px 0 rgba(0,0,0,.07)` |

| **Floating** (modals, panels) | Modals, notification panels | `0 20px 60px rgba(0,0,0,.20)` |

| **Overlay** (toasts) | Toast notifications | `0 8px 20px rgba(0,0,0,.15)` |

**Rules:**

- Cards never have a `border` — shadow provides the separation.

- Sidebar has no shadow — the colour contrast separates it.

- Topbar uses `border-bottom: 1px solid #d8e2ef` only; no shadow.

- Input elements: border (not shadow) at rest; shadow ring on focus.

- Never nest more than two elevated layers visually (e.g. a modal may contain a dropdown, but not another modal).

---

## Shapes

All shapes follow the `rounded` token scale. There is no free-form border-radius.

| Element | Token | Value |

|---------|-------|-------|

| Buttons | `rounded.md` | 6px |

| Inputs, selects, textareas | `rounded.md` | 6px |

| Cards | `rounded.lg` | 8px |

| Badges / pills | `rounded.sm` | 4px |

| Modals | `rounded.xl` | 12px |

| Dropdowns | `rounded.lg` | 8px |

| Toasts | `rounded.lg` | 8px |

| Avatar | `rounded.full` | 9999px |

| Progress bar | `rounded.full` | 9999px |

| Notification badge | `rounded.full` | 9999px |

| Sidebar nav item | `rounded.md` | 6px |

| Icon circle (stat card) | `rounded.full` | 9999px |

**Rule:** Never use `border-radius: 50%` directly — always `border-radius: 9999px` (maps to `rounded.full`) for circles.

---

## Components

### Buttons

Four variants. All buttons share: `font-family: Poppins`, `font-weight: 500`, `font-size: 0.8125rem`, `line-height: 1`, `cursor: pointer`, `border: none` (except secondary), `display: inline-flex; align-items: center; gap: 6px`, `transition: background 0.15s`.

```

Primary:   bg #2c7be5  → hover #1a68c8 | text white   | padding 8px 16px | radius 6px

Secondary: bg white    → hover #d5e5fa | text #2c7be5 | border 1px solid #2c7be5

Light:     bg #edf2f9  → hover #d8e2ef | text #748194 | border 1px solid #d8e2ef

Danger:    bg #e63757  → hover #c0002e | text white

Success:   bg #00d27a  → hover #00864e | text white

```

Icons inside buttons: 14–16px, same color as text, `flex-shrink: 0`.

**Disabled state** (all variants): `opacity: 0.5; cursor: not-allowed; pointer-events: none`.

---

### Forms

**Field anatomy:**

```

[Label]            ← body-sm, weight 600, color #344050, margin-bottom 4px

[Input / Select]   ← 36px height, border #d8e2ef, radius 6px, padding 8px 12px

[Helper text]      ← caption, color #748194, margin-top 4px

[Error text]       ← caption, color #e63757, margin-top 4px

```

**Input states:**

- **Default:** `border: 1px solid #d8e2ef`

- **Focus:** `border-color: #2c7be5; box-shadow: 0 0 0 3px #d5e5fa; outline: none`

- **Error:** `border-color: #e63757; box-shadow: 0 0 0 3px #fce8eb`

- **Disabled:** `background: #edf2f9; color: #748194; cursor: not-allowed`

- **Read-only:** same as disabled visually; `cursor: default`

**Select specifics:** Custom chevron (ChevronDown 14px, color `#748194`) positioned `absolute right: 12px`. No system arrow.

**Checkbox / Radio:** 16×16px custom element. Checked state uses `#2c7be5` fill. Label sits 8px to the right. Never use browser-default styling.

**Form groups:** Vertical stack with 16px gap between fields. Two-column forms use CSS Grid `repeat(2, 1fr)` with `gap: 16px`.

---

### Cards

Basic card anatomy:

```

+--[Card] bg:#fff, radius:8px, shadow:raised--+

| [Card Header] padding:16px 20px             |

|   <h4 weight:600> Title </h4>               |

|   [Actions — button-light or dropdown]      |

+---------------------------------------------+

| [Card Body] padding:20px 24px               |

|   Content                                   |

+---------------------------------------------+

| [Card Footer] bg:#edf2f9 padding:12px 20px  | ← optional

+---------------------------------------------+

```

**Stat Card specifics:**

- Icon circle: `width/height: 32px; border-radius: 9999px; background: colorHex + "1a"` (10% opacity of accent color).

- Title: `label-caps`, color `#748194`.

- Value: `font-size: 1.625rem; font-weight: 700; color: #344050`.

- Change indicator: ArrowUpRight (success) or ArrowDownRight (danger) icon 14px + percentage text 12px bold.

---

### Tables

```

+--[Table Card wrapper with raised shadow]---+

| [Table Header row] bg:#edf2f9             |

|   TH: label-caps, color:#748194           |

|   padding: 10px 16px                      |

+-------------------------------------------+

| [Table Body row]                          |

|   TD: body-sm, color:#344050              |

|   padding: 12px 16px                      |

|   border-bottom: 1px solid #d8e2ef        |

|   hover: bg #f9fbfd (transition 0.1s)     |

+-------------------------------------------+

```

Primary column (ID/reference): color `#2c7be5`, `font-weight: 500`.

Status columns: always use a badge component — never plain text.

Last row has no `border-bottom`.

---

### Sidebar

```

[Sidebar] width:300px, bg:#0b1727

 ├── [Logo zone] padding:24px 20px 16px

 │     border-bottom: 1px solid rgba(255,255,255,0.08)

 │     Logo icon 32px (primary bg) + "falcon" text white 18px/700

 │

 ├── [Section label] "MAIN MENU"

 │     font: sidebar-section, color:#6e7d9a, padding:20px 24px 8px

 │

 ├── [Nav item — inactive]

 │     color:#9da9bb, padding:10px 16px, margin:2px 8px, radius:6px

 │     icon 16px + label 13px/500 + ChevronRight 14px (if has children)

 │     hover: bg rgba(255,255,255,0.08)

 │

 ├── [Nav item — active]

 │     bg: rgba(44,123,229,0.15), color:#2c7be5

 │

 └── [Child items] padding-left:40px, font:caption

       color:#9da9bb, hover: color:#ffffff

```

Sidebar bottom: storage/status card — `margin: 0 16px 20px`, background `rgba(255,255,255,0.05)`, border `1px solid rgba(255,255,255,0.08)`, radius 8px.

---

### Modals

**Overlay:** `position: fixed; inset: 0; background: rgba(11,23,39,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center`.

**Dialog box:** centered, `max-width: 90vw`, enter animation `opacity 0→1 + translateY(8px→0)` over 200ms ease.

**Sizes:**

- Small: `width: 400px` — confirmation dialogs, delete confirms.

- Default: `width: 520px` — most forms, detail views.

- Large: `width: 720px` — complex forms, data entry.

- XL: `width: 960px` — tables within modals, multi-step wizards.

**Close button:** X icon (20px, color `#748194`) positioned `absolute top: 16px; right: 20px`. Hover: color `#344050`. Click closes modal.

**Footer actions:** `justify-content: flex-end; gap: 8px`. Order: Cancel (button-light) → Confirm (button-primary or button-danger).

**Escape key** must always dismiss the modal. Background click should dismiss unless `data-persistent` is set.

---

### Popups & Dropdowns

**Trigger:** click-to-toggle (not hover). A second click or Escape closes. Clicking outside also closes.

**Positioning:** absolute to trigger, `z-index: 200`. Prefer `bottom` alignment on small screens.

```

[Dropdown] bg:#fff, radius:8px, border:1px solid #d8e2ef

 shadow: 0 8px 24px rgba(0,0,0,0.12)

 padding: 4px 0



 ├── [Dropdown Header] label-caps, color #748194, padding:8px 16px 4px

 ├── [Dropdown Item]   body-sm #344050, padding:9px 16px

 │     icon 14px left, label, optional shortcut right

 │     hover: bg:#edf2f9

 ├── [Divider]         height:1px, bg:#d8e2ef, margin:4px 0

 └── [Danger item]     color:#e63757

```

User profile dropdown (topbar): width 200px. Notification panel: width 300px with fixed header + scrollable list.

---

### Notifications & Toasts

**Toast (transient, auto-dismiss after 4s):**

- Position: `fixed; bottom: 24px; right: 24px; z-index: 1100`.

- Stack newest on top with 8px gap.

- Enter: `translateX(110%) → translateX(0)` in 250ms ease.

- Exit: `opacity 1→0` in 200ms then remove.

- Anatomy: [left colored bar 3px] + [icon 16px] + [title bold 13px] + [message 12px muted] + [X close button].

**Alert (inline, persistent):**

- `border-left: 4px solid <color>; border-radius: 6px; padding: 12px 16px`.

- Icon 16px left-aligned with first line of text. Dismiss X button absolute right.

- Anatomy: [icon] + [bold title] + [description] + optional [action link].

**Notification panel (topbar dropdown):**

- Header: "Notifications" h5 + "Mark all as read" link (color primary, right-aligned).

- Item: avatar/icon + content text + timestamp (caption, muted). `NEW` / `EARLIER` section labels use `label-caps`.

- "View all" link at bottom, centered, `body-sm`, `color: primary`.

---

### Badges

Use only the 5 predefined badge variants (success, warning, danger, primary, info). Never create custom-color badges.

```

[Badge] padding:3px 10px | radius:4px | font:label-caps (uppercase, 0.6875rem, 700)

```

Badges are inline elements — never block. Do not add icons inside badges (that becomes a "chip" — use a different pattern).

---

## Do's and Don'ts

### ✅ DO

- **Use Poppins exclusively.** Load from Google Fonts. Always include fallback stack.

- **Use semantic color pairs** — `*-light` as background, `*-dark` as text. Never use base semantic colors (`#00d27a`) as text on white.

- **Use raised shadow on all cards.** Never use just a border to separate cards from the body.

- **Keep the sidebar dark.** The navy `#0b1727` is non-negotiable in light mode.

- **Use `label-caps` for ALL table headers and badge text** — uppercase + 0.08em tracking + weight 700.

- **Stack form fields vertically** with 16px gap. Use 2-column grid only for short sibling fields (e.g. First Name + Last Name).

- **Use the full modal size range.** Delete confirms → small. Multi-field forms → default. Complex data → large.

- **Animate modals and toasts.** Minimum: opacity fade + slight Y translate for modals; slide-in-right for toasts.

- **Use ChevronRight (rotated to ChevronDown) for sidebar accordion arrows.** CSS `transform: rotate(90deg)` on open.

- **Provide loading states** for async content: use a subtle skeleton (background `#edf2f9` animated shimmer) not a spinner in the card center.

- **Respect z-index stack:** content (1) → topbar (100) → dropdowns (200) → modal overlay (1000) → toasts (1100).

### ❌ DON'T

- **Don't use gradients** on buttons, cards, or backgrounds. Falcon is flat — depth comes from shadow only.

- **Don't use Inter, Roboto, or system fonts** as the primary typeface. Always load Poppins.

- **Don't change the sidebar background color.** It is always `#0b1727`.

- **Don't use `border` on cards** — use shadow only (`card` component token).

- **Don't use status text without a badge.** Order statuses, ticket states, etc. must always be wrapped in the appropriate badge component.

- **Don't use `border-radius > 12px`** on any container element (exceeds `rounded.xl`).

- **Don't stack shadows** (e.g. card inside card both with shadows). Only the outermost layer gets the raised shadow.

- **Don't use the base semantic colors as text** on light backgrounds — they fail WCAG AA. Use the `*-dark` variant.

- **Don't use all-caps for headings or body text** — only `label-caps` elements are uppercase.

- **Don't put more than 2 primary actions** in a card header or modal footer.

- **Don't use hover color changes on the sidebar** for the active item — only inactive items have hover states.

- **Don't use purple, teal, or pink** — these colors are not part of the Falcon palette. Any new semantic color must be added as a full three-variant group (base/light/dark) using the existing pattern.

- **Don't dismiss modals on background click** if the modal contains an unsaved form — use `data-persistent` and show a "Discard changes?" confirmation instead.

- **Don't use inline `style` attributes for colors or spacing in production code** — always reference design tokens via CSS variables or Tailwind classes derived from this file.

---

## Agent Instructions

When generating any UI component for this project:

1. **Read this entire file before writing a single line of code.**

2. Reference tokens using the exact names defined in the YAML front matter.

3. For any component not explicitly defined in the `Components` section, derive its style from the closest analogous component + the color, typography, and shape scales.

4. Every interactive element must have at least a hover state and a focus state.

5. Every form field must have all four states: default, focus, error, disabled.

6. Every modal must have: overlay, header with close button, body, and footer with action buttons.

7. Toast notifications must auto-dismiss after 4 seconds and support manual dismiss.

8. Do not use any external component library that imposes its own design tokens (e.g. Material UI, Ant Design, Chakra) — implement components from scratch using only the tokens in this file.

9. When in doubt between two token values, choose the smaller/subtler option — Falcon errs towards restraint.

10. Validate color contrast for any new text/background combination before finalising. Minimum WCAG AA (4.5:1 for body text, 3:1 for large text/icons).
