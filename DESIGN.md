# Entrack Application Design System Specification (`DESIGN.md`)

This document defines the canonical UI design system, color tokens, button specs, backdrop blurs, typography rules, animations, and responsive mobile behaviors for the application.

---

## 1. Core Visual Aesthetic

- **Style**: Corporate Minimalist with Glassmorphic accents & Modern Dark/Light Elevation.
- **Theme Support**: Seamless Light & Dark mode support driven by CSS variables in `:root` and `.dark-mode`.
- **Typography**: Inter / Segoe UI with tight letter spacing for data density and institutional clarity.

---

## 2. Color Palette & Tokens

### Backgrounds & Surfaces
| Token | Light Mode Value | Dark Mode Value | Usage |
| :--- | :--- | :--- | :--- |
| `--bg-primary` | `#f6f8fb` | `#000000` | Main application background |
| `--bg-secondary` | `#ffffff` | `#050505` | Sidebar & secondary containers |
| `--bg-card` | `#ffffff` | `#070707` | Dashboard & backtesting cards |
| `--surface-elevated` | `#ffffff` | `#090909` | Modals, dialogs, floating panels |
| `--surface-subtle` | `#f8fafc` | `#0d0d0d` | Form field backgrounds, table headers |
| `--surface-muted` | `rgba(148, 163, 184, 0.1)` | `rgba(255, 255, 255, 0.06)` | Hover highlight badges, subtle fills |

### Typography & Text Colors
| Token | Light Mode Value | Dark Mode Value | Usage |
| :--- | :--- | :--- | :--- |
| `--heading` | `#0f172a` | `#ffffff` | Page titles, modal headings, metric values |
| `--text-primary` | `#0f172a` | `#f8fafc` | Main body text, active labels |
| `--text-secondary` | `#475569` | `#cbd5e1` | Subtitles, field labels, metadata |
| `--text-muted` | `#64748b` | `#94a3b8` | Placeholders, disabled text |

### Borders & Dividers
| Token | Light Mode Value | Dark Mode Value | Usage |
| :--- | :--- | :--- | :--- |
| `--border-light` | `#e2e8f0` | `#1f1f1f` | Standard card borders, header dividers |
| `--border-medium` | `#cbd5e1` | `#2a2a2a` | Hover borders, active container outlines |
| `--divider-strong` | `#e2e8f0` | `#242424` | Input outlines, dropdown dividers |

### Buttons & Interactive Action Colors
| Token | Light Mode Value | Dark Mode Value | Usage |
| :--- | :--- | :--- | :--- |
| `--button-bg` | `#175CD3` | `#175CD3` | Primary action button fill |
| `--button-bg-hover` | `#1849A9` | `#2E90FA` | Primary action button hover fill |
| `--button-text` | `#ffffff` | `#ffffff` | Primary action button text color |
| `--bg-hover` | `rgba(15, 23, 42, 0.08)` | `rgba(255, 255, 255, 0.08)` | List row & icon button hover fill |
| `--checkbox-accent` | `#175CD3` (Blue) | `#3b82f6` (Blue) | Shared checkbox checked accent state |

### Financial & P&L Indicators
| Token | Light Mode Value | Dark Mode Value | Usage |
| :--- | :--- | :--- | :--- |
| `--profit-color` / `--pnl-positive` | `#16a34a` | `#86efac` | Positive P&L, winning trades |
| `--loss-color` / `--pnl-negative` | `#b91c1c` | `#f87171` | Negative P&L, losing trades |
| `--bull-candle` | `#089981` | `#089981` | Bullish chart candlestick |
| `--bear-candle` | `#f23645` | `#f23645` | Bearish chart candlestick |

---

## 3. Backdrop & Blur Specifications

> [!IMPORTANT]
> **Backtesting Main Content Blur Isolation Rule**:
> Modal backdrop blurs on `/backtesting` (`.backtest-session-modal__backdrop`) MUST ONLY cover the main content workspace (`.backtest-terminal`). The backdrop blur MUST NEVER cover, blur, or obscure the top page header (`PageHeader`) or the left navigation sidebar. This is achieved by nesting `.backtest-session-modal` inside `.backtest-terminal` with `position: absolute; inset: 0;` scoped to `.backtest-terminal` (`position: relative`).

| Application | CSS Properties | Description | Source |
| :--- | :--- | :--- | :--- |
| **Backtesting Modal Blur (Main Content Only)** | `background: rgba(15, 23, 42, 0.16);`<br>`backdrop-filter: blur(6px);`<br>`-webkit-backdrop-filter: blur(6px);`<br>`position: absolute; inset: 0;` | Scoped strictly to `.backtest-terminal`. Top header & sidebar remain completely clear. | `BacktestingPage.css:L1242-L1265` |
| **Dark Mode Backtesting Backdrop** | `background: rgba(0, 0, 0, 0.42);`<br>`backdrop-filter: blur(6px);` | Dark mode popover overlay backdrop scoped to `.backtest-terminal` | `BacktestingPage.css:L1261` |
| **Calendar & Filter Popup Backdrop** | `background: rgba(15, 23, 42, 0.16);`<br>`backdrop-filter: blur(6px);` | Standard popup overlay blur used in calendar & currency popups | `TradeView.css:L180-L182` |
| **Canonical Dark Backdrop** | `background: var(--overlay-backdrop);` (`rgba(15, 23, 42, 0.72)`) | High-contrast dark modal overlay | `ThatTrade.css:L331` |
| **AddTrade Modal Backdrop** | `background: rgba(5, 10, 18, 0.42);`<br>`backdrop-filter: blur(10px);` | Form modal backdrop | `AddTrade.css:L2268-L2269` |

---

## 4. Button & Control Specs

### Primary Action Button (`.btn-primary`, `.backtest-session-submit`)
- **Height / Min-Height**: `40px` (standard) / `44px` (modal CTA) / `34px` (header action).
- **Padding**: `0 16px` (desktop) / `0 14px` (compact header).
- **Border Radius**: `8px` (cards) / `10px` (modals) / `12px` (forms).
- **Background**: `var(--button-bg)` (`#175CD3` Blue).
- **Text Color**: `var(--button-text)` (`#ffffff` White).
- **Font**: Size `13px` - `14px`, Weight `700`, Letter Spacing `0.01em`.
- **Shadow**: `0 4px 12px rgba(0, 0, 0, 0.12)`.
- **Hover Behavior**: `background: var(--button-bg-hover)`, `transform: translateY(-1px)`.
- **Disabled State**: `opacity: 0.72`, `cursor: wait` or `cursor: not-allowed`.

### Secondary / Subtle Button (`.btn-secondary`, `.backtest-session-modal__close`)
- **Border**: `1px solid var(--border-light)`.
- **Border Radius**: `8px` or `50%` (circular icon button).
- **Background**: `var(--surface-subtle)`.
- **Text Color**: `var(--text-secondary)`.
- **Hover Behavior**: `background: var(--bg-hover)`, `border-color: var(--border-medium)`, `color: var(--heading)`.

### Checkbox Controls
- **Accent Color**: Uses shared `--checkbox-accent` (`#db2777` in light mode, `#f472b6` in dark mode).

---

## 5. Border Radius Scale

- **`--radius-sm` (`4px`)**: Small badges, micro tags.
- **`--radius-md` (`8px`)**: Standard buttons, input fields, cards.
- **`--radius-lg` (`12px`)**: Dashboard cards, form group containers.
- **`--radius-xl` (`16px`)**: Modal dialog containers (`.backtest-session-modal__panel`, `app-confirm`).
- **`--radius-2xl` (`20px`)**: Floating popovers, large feature cards.

---

## 6. Typography & Formatting Rules

- **Font Family**: `'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif`.
- **User-Facing Dates**: Must ALWAYS be formatted as `DD/MM/YYYY` (Time: `DD/MM/YYYY HH:mm`). Never use browser-locale month-first dates.
- **Page Title (`.app-page-title`)**: `font-size: clamp(18px, 1.14vw, 21px)`, `font-weight: 650`.
- **Section Heading (`h3`, `h4`)**: `font-size: 14px - 17px`, `font-weight: 700`.
- **Field Labels**: `font-size: 11px`, `font-weight: 700`, `text-transform: uppercase`, `letter-spacing: 0.04em`.

---

## 7. Animations & Transitions

### Keyframes
- **`modalPop` (Modal Entrance)**:
  ```css
  @keyframes modalPop {
    from { opacity: 0; transform: scale(0.96) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  ```
  - **Timing**: `0.25s cubic-bezier(0.16, 1, 0.3, 1)`.

- **`backtest-loading-pulse` (Loading Indicator)**:
  ```css
  @keyframes backtest-loading-pulse {
    0%, 100% { opacity: 0.35; transform: scale(0.82); }
    50% { opacity: 1; transform: scale(1); }
  }
  ```

---

## 8. Mobile View & Responsive Layout Rules

### Responsive Breakpoints
- **Mobile Handsets (`< 520px`)**:
  - Modal form grids collapse to single-column (`grid-template-columns: 1fr`).
  - Modal padding reduces from `24px` to `16px`.
- **Tablet / Mobile Shell (`< 768px`)**:
  - Main container padding adjusts to `12px`.
  - Alert stack switches to full-width header notification strip (`right: 12px; left: 12px`).
  - Page header title size adjusts dynamically via `clamp()`.

### Sticky Header Auto-Hide (Mobile & Desktop)
- `.app-page-header`: Sticky at `top: 0`, `z-index: 200`, `height: 54px`.
- Scroll down (`delta > 4px`): Slides up (`transform: translateY(-100%)`, `opacity: 0`).
- Scroll up (`delta < -4px` or top of page): Slides back down into view.

### Touch Optimizations
- `touch-action: manipulation` applied to all buttons, links, inputs, and interactive controls.
- `-webkit-tap-highlight-color: transparent` to eliminate tap flash artifacts on iOS and Chrome Android.
