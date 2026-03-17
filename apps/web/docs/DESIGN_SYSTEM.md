# UFOS Design System

> **Last Updated**: March 17, 2026
> **Design Inspiration**: [Nixtio](https://dribbble.com/Nixtio) -- Finance, Crypto, and Enterprise Dashboard patterns

---

## 1. Design Philosophy

- **Institution-grade visual identity** for algorithmic trading + wealth management
- **Dual-theme support**: Dark Mode for trading execution (glass-morphism, subtle gradients), Light Mode for wealth planning (clean whites, warm accents)
- **Data-dense but not cluttered** -- every pixel earns its space
- **Real-time-first**: animations and transitions communicate live state changes
- **Progressive disclosure**: surface key metrics immediately, reveal detail on interaction
- **Consistency over novelty**: predictable component behavior builds trader confidence during volatile markets

---

## 2. Color System

### Dark Theme (Trading Mode)

The primary trading interface. Optimized for extended screen time, low-light environments, and maximum contrast on financial data.

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0A0A0F` | Page background, deepest layer |
| `--bg-secondary` | `#12121A` | Sidebar, panel backgrounds |
| `--bg-card` | `#1A1A24` | Card surfaces, elevated containers |
| `--bg-elevated` | `#22222E` | Dropdowns, popovers, modals |
| `--border-default` | `rgba(255, 255, 255, 0.08)` | Subtle card borders |
| `--border-hover` | `rgba(255, 255, 255, 0.15)` | Interactive border on hover |

**Glass-morphism surface:**

```css
.glass-card {
  backdrop-filter: blur(24px);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 1rem;
}
```

**Semantic Colors (Dark):**

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `--profit` | `#22C55E` | `green-500` | Positive P&L, buy signals |
| `--loss` | `#EF4444` | `red-500` | Negative P&L, sell signals |
| `--accent-primary` | `#A3E635` | `lime-400` | Primary CTA, active states |
| `--accent-secondary` | `#FBBF24` | `amber-400` | Warnings, secondary highlights |
| `--info` | `#38BDF8` | `sky-400` | Informational badges, links |

**Text Hierarchy (Dark):**

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `--text-primary` | `#F8FAFC` | `slate-50` | Headlines, portfolio values |
| `--text-secondary` | `#94A3B8` | `slate-400` | Labels, descriptions |
| `--text-muted` | `#475569` | `slate-600` | Timestamps, meta info |

### Light Theme (Wealth Mode)

For wealth planning, advisory dashboards, and daytime use. Clean, approachable, and print-friendly.

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#F0FDF4` | Page background with subtle green tint |
| `--bg-secondary` | `#FFFFFF` | Card backgrounds |
| `--bg-card` | `#FFFFFF` | Elevated card surfaces |
| `--bg-elevated` | `#F8FAFC` | Dropdowns, popovers |
| `--border-default` | `#E2E8F0` | Card borders (`slate-200`) |

**Card surface:**

```css
.light-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  border-radius: 1rem;
}
```

**Semantic Colors (Light):**

| Token | Value | Usage |
|-------|-------|-------|
| `--profit` | `#16A34A` | `green-600` -- darker for contrast |
| `--loss` | `#DC2626` | `red-600` -- darker for contrast |
| `--accent-primary` | `#65A30D` | `lime-600` |
| `--accent-secondary` | `#D97706` | `amber-600` |
| `--info` | `#0284C7` | `sky-600` |

**Text Hierarchy (Light):**

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `--text-primary` | `#0F172A` | `slate-900` | Headlines, values |
| `--text-secondary` | `#475569` | `slate-600` | Labels, descriptions |
| `--text-muted` | `#94A3B8` | `slate-400` | Timestamps, meta |

### Gradient Tokens

```css
--gradient-profit: linear-gradient(135deg, #22C55E 0%, #A3E635 100%);
--gradient-loss: linear-gradient(135deg, #EF4444 0%, #F97316 100%);
--gradient-accent: linear-gradient(135deg, #A3E635 0%, #FBBF24 100%);
--gradient-glass: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
```

---

## 3. Typography

Font stack: `Inter` for UI, `JetBrains Mono` for financial figures and code.

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
```

### Scale

| Role | Classes | Example |
|------|---------|---------|
| **Display / Hero Numbers** | `font-mono text-4xl font-bold tracking-tight` | Portfolio value: `$62,745.00` |
| **Large Value** | `font-mono text-2xl font-bold` | Card metric: `₹24,57,832` |
| **Change Indicator** | `text-sm font-medium` + profit/loss color + arrow icon | `▲ +₹1,23,456 (+5.28%)` |
| **Section Header** | `text-lg font-semibold tracking-tight` | `Portfolio Allocation` |
| **Card Title** | `text-base font-medium` | `Realized P&L` |
| **Body** | `text-sm text-secondary leading-relaxed` | Descriptions, explanations |
| **Micro / Label** | `text-xs text-muted uppercase tracking-wider` | `TOTAL INVESTED`, `LAST UPDATED` |
| **Table Data** | `font-mono text-sm tabular-nums` | `₹4,825.00`, `23.5%` |

### Number Formatting

- Indian locale for INR: `₹24,57,832.00` (Intl.NumberFormat with `en-IN`)
- USD: `$62,745.00` (Intl.NumberFormat with `en-US`)
- Percentages always show sign: `+5.28%` or `-2.14%`
- Large numbers abbreviate at > 1Cr: `₹1.2Cr`, `₹45.6L`
- Use `tabular-nums` for columns of numbers so digits align vertically

---

## 4. Component Patterns

### 4.1 Hero Balance Card

Large portfolio value display with period-change badge and embedded sparkline. Inspired by Nixtio crypto wallet screens.

```
┌──────────────────────────────────────┐
│  Portfolio Value              ⚙️  ↗️ │
│  ₹24,57,832.00                      │
│  +₹1,23,456 (+5.28%)  ▲  This Week │
│  [1D] [1W] [1M] [3M] [1Y] [ALL]    │
│  ┈┈┈╱╲┈┈┈╱╲╲╱╲┈┈┈ (sparkline)      │
└──────────────────────────────────────┘
```

**Implementation:**

```tsx
<HeroBalanceCard
  value={2457832}
  change={123456}
  changePercent={5.28}
  period="1W"
  sparklineData={number[]}
  currency="INR"
/>
```

**Specs:**
- Card spans full width on mobile, 2 columns on desktop
- Value uses `font-mono text-4xl font-bold`
- Change badge: colored pill with arrow icon, profit/loss semantic color
- Period toggle: see [4.6 Time Period Toggle](#46-time-period-toggle)
- Sparkline: 48px tall, area fill with gradient, no axis labels
- Dark theme: glass-morphism surface with accent gradient border on top edge
- Light theme: white card with subtle shadow

### 4.2 Glass-Morphism Metric Card

Single-stat card with backdrop blur for the dark trading interface.

```tsx
<div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 space-y-2">
  <span className="text-xs text-muted uppercase tracking-wider">
    Realized P&L
  </span>
  <span className="text-2xl font-mono font-bold text-profit">
    +₹1,28,429.00
  </span>
  <span className="text-xs text-profit flex items-center gap-1">
    <ArrowUpIcon className="w-3 h-3" /> +23% Today
  </span>
</div>
```

**Variants:**
- `default`: backdrop blur with subtle border
- `highlighted`: accent gradient left border (4px solid accent-primary)
- `interactive`: hover scale-[1.02] with border brightening
- `danger`: loss-color top border for negative metrics

**Specs:**
- Border radius: `rounded-2xl` (1rem)
- Padding: `p-6` (1.5rem)
- Min width: 200px, max width: 400px in grid
- Transitions on value change: number morphing with brief color flash

### 4.3 Transaction List Item

Color-coded transaction row with instrument, status badge, and amount.

```
┌─────────────────────────────────────────┐
│ 🟢 NIFTY 24500 CE    ●Confirmed  ₹+4,825│
│    Buy · 2 lots · 15:23:47              │
├─────────────────────────────────────────┤
│ 🔴 BANKNIFTY FUT      ●Pending   ₹-2,351│
│    Sell · 1 lot · 15:24:12              │
└─────────────────────────────────────────┘
```

**Implementation:**

```tsx
<TransactionItem
  instrument={{ name: "NIFTY 24500 CE", type: "option" }}
  side="buy"
  quantity={2}
  unit="lots"
  status="confirmed"
  amount={4825}
  timestamp="2026-03-17T15:23:47"
/>
```

**Specs:**
- Left color bar: 3px solid, green for buy, red for sell
- Instrument name: `text-sm font-medium text-primary`
- Status: `<StatusBadge />` component (see [4.11](#411-status-badge-pills))
- Amount: `font-mono text-sm font-semibold`, colored by P&L sign
- Metadata row: side, quantity, timestamp in `text-xs text-muted`
- Hover: `bg-white/5` (dark) or `bg-slate-50` (light)
- Divider: `border-b border-white/5` (dark) or `border-slate-100` (light)

### 4.4 Donut Allocation Chart

Interactive donut/pie chart with center summary and segment callouts.

**Implementation:**

```tsx
<AllocationDonut
  data={[
    { label: "Large Cap", value: 45, color: "#22C55E" },
    { label: "Mid Cap", value: 30, color: "#A3E635" },
    { label: "Small Cap", value: 15, color: "#FBBF24" },
    { label: "Debt", value: 10, color: "#38BDF8" },
  ]}
  centerLabel="Total"
  centerValue="₹24.5L"
  size={220}
/>
```

**Specs:**
- Donut thickness: 32px stroke
- Center: label in `text-xs text-muted`, value in `text-xl font-mono font-bold`
- Segments: hover enlarges slice, shows tooltip with value + percentage
- Legend: below chart on mobile, right side on desktop
- Animation: segments animate in clockwise on mount (`duration-700 ease-out`)
- Library: Recharts `<PieChart>` with custom active shape

### 4.5 Risk Score Gauge

Semi-circular gauge visualization showing portfolio risk from Low (green) through Medium (amber) to High (red).

```
┌──────────────────────────┐
│   Portfolio Risk Score   │
│      ╭─── 34% ───╮      │
│   Low ════════ High      │
│                          │
│ ● High Risk    34%  ██░░ │
│ ● Low Risk     57%  ████ │
│ ● Medium Risk   9%  █░░░ │
└──────────────────────────┘
```

**Implementation:**

```tsx
<RiskScoreGauge
  score={34}
  breakdown={[
    { label: "High Risk", value: 34, color: "#EF4444" },
    { label: "Low Risk", value: 57, color: "#22C55E" },
    { label: "Medium Risk", value: 9, color: "#FBBF24" },
  ]}
  maxScore={100}
/>
```

**Specs:**
- Gauge: custom SVG arc, 180-degree sweep
- Gradient: green → amber → red across the arc
- Needle: animated pointer at score position
- Score display: centered above gauge, `text-3xl font-mono font-bold`
- Breakdown: horizontal bar segments below gauge
- Risk label color matches the dominant risk band

### 4.6 Time Period Toggle

Pill-style selector for chart time range switching.

```tsx
<TimePeriodToggle
  options={["1H", "8H", "1D", "1W", "1M", "6M", "1Y"]}
  selected={selected}
  onChange={setSelected}
/>
```

**Specs:**
- Container: `inline-flex rounded-full bg-white/5 p-1` (dark) or `bg-slate-100 p-1` (light)
- Active pill: `bg-accent-primary text-bg-primary rounded-full px-3 py-1`
- Inactive: `text-secondary px-3 py-1 hover:text-primary`
- Transition: active indicator slides with `transition-all duration-200`
- Use `framer-motion` `layoutId` for smooth active indicator animation

### 4.7 P&L Calendar Heatmap

Monthly calendar grid where each day cell is color-coded by realized P&L.

**Implementation:**

```tsx
<PnLCalendar
  data={[
    { date: "2026-03-01", pnl: 1250 },
    { date: "2026-03-02", pnl: -340 },
    // ...
  ]}
  month={3}
  year={2026}
/>
```

**Specs:**
- Grid: 7 columns (Mon-Sun), 4-6 rows per month
- Cell size: 40x40px desktop, 32x32px mobile
- Color scale (profit): `bg-green-900/30` → `bg-green-500` (intensity maps to magnitude)
- Color scale (loss): `bg-red-900/30` → `bg-red-500`
- Neutral day: `bg-white/5` (dark) or `bg-slate-100` (light)
- Hover: tooltip with exact P&L value and trade count
- Today: ring indicator `ring-2 ring-accent-primary`

### 4.8 Quick Actions Grid

2x3 or 3x2 grid of icon-labeled action buttons for frequently used operations.

```
┌──────┐ ┌──────┐ ┌──────┐
│  📊  │ │  📈  │ │  ⚡  │
│Analyze│ │ Trade│ │Quick │
│       │ │      │ │Order │
└──────┘ └──────┘ └──────┘
```

**Implementation:**

```tsx
<QuickActionsGrid
  actions={[
    { icon: ChartBarIcon, label: "Analyze", href: "/analyze" },
    { icon: TrendingUpIcon, label: "Trade", href: "/trade" },
    { icon: BoltIcon, label: "Quick Order", href: "/order" },
    { icon: BellIcon, label: "Alerts", href: "/alerts" },
    { icon: CalendarIcon, label: "Calendar", href: "/calendar" },
    { icon: CogIcon, label: "Settings", href: "/settings" },
  ]}
  columns={3}
/>
```

**Specs:**
- Button: glass card surface, `rounded-xl p-4 text-center`
- Icon: `w-8 h-8 text-accent-primary mx-auto mb-2`
- Label: `text-xs font-medium text-secondary`
- Hover: `scale-105 border-accent-primary/30`
- Active: brief `scale-95` press animation
- Responsive: 2 columns on mobile, 3 on tablet+

### 4.9 Welcome Banner

Personalized greeting bar with daily snapshot metrics.

```
┌─────────────────────────────────────────────┐
│ Good morning, Rohan!              March 17  │
│                                             │
│ Market: 🟢 Open    P&L: +₹4,825   Alerts: 3│
│ Positions: 4 active   Next expiry: Mar 27   │
└─────────────────────────────────────────────┘
```

**Implementation:**

```tsx
<WelcomeBanner
  userName="Rohan"
  date={new Date()}
  metrics={{
    marketStatus: "open",
    todayPnL: 4825,
    alertCount: 3,
    activePositions: 4,
    nextExpiry: "2026-03-27",
  }}
/>
```

**Specs:**
- Greeting: time-aware (`Good morning/afternoon/evening`) + user first name
- Date: `text-sm text-muted`, formatted as `March 17`
- Metric pills: inline flex, icon + value pairs
- Market status: green dot for open, red for closed, amber for pre-market
- Full width, no border radius on mobile (edge-to-edge), `rounded-2xl` on desktop
- Background: subtle gradient or glass surface

### 4.10 AI Chat Interface

Natural language trading assistant with quick-action suggestion cards.

```
┌─────────────────────────────────────┐
│ How can I help you today?           │
│                                     │
│ ┌─────────┐ ┌──────────┐           │
│ │ Analyze  │ │ Explain  │           │
│ │Portfolio │ │Last Trade│           │
│ └─────────┘ └──────────┘           │
│ ┌─────────┐ ┌──────────┐           │
│ │ Suggest  │ │  Scan    │           │
│ │Strategy │ │ Market   │           │
│ └─────────┘ └──────────┘           │
│                                     │
│ [Ask or search for anything...]     │
└─────────────────────────────────────┘
```

**Implementation:**

```tsx
<AIChatInterface
  greeting="How can I help you today?"
  quickActions={[
    { label: "Analyze Portfolio", prompt: "Analyze my current portfolio allocation" },
    { label: "Explain Last Trade", prompt: "Explain my last executed trade" },
    { label: "Suggest Strategy", prompt: "Suggest a hedging strategy for my positions" },
    { label: "Scan Market", prompt: "Scan NIFTY options chain for opportunities" },
  ]}
  onSubmit={(message) => {}}
  placeholder="Ask or search for anything..."
/>
```

**Specs:**
- Container: full-height panel or modal overlay
- Greeting: `text-xl font-semibold text-primary`
- Quick action cards: 2-column grid, glass surface, `rounded-xl p-4`
- Card hover: `scale-[1.02] border-accent-primary/30`
- Input: bottom-pinned, full-width, `rounded-full` with send button
- Messages: alternating alignment, user right-aligned, AI left-aligned
- AI responses: support markdown, code blocks, and embedded chart components
- Streaming: token-by-token rendering with cursor blink

### 4.11 Status Badge Pills

Semantic status indicators used across transactions, orders, and system states.

```tsx
<StatusBadge status="confirmed" />   // green dot + "Confirmed"
<StatusBadge status="pending" />      // amber dot + "Pending"
<StatusBadge status="failed" />       // red dot + "Failed"
<StatusBadge status="cancelled" />    // gray dot + "Cancelled"
<StatusBadge status="processing" />   // blue dot + pulse animation + "Processing"
```

**Specs:**

| Status | Dot Color | Background | Text Color |
|--------|-----------|------------|------------|
| `confirmed` | `bg-green-500` | `bg-green-500/10` | `text-green-400` |
| `pending` | `bg-amber-500` | `bg-amber-500/10` | `text-amber-400` |
| `failed` | `bg-red-500` | `bg-red-500/10` | `text-red-400` |
| `cancelled` | `bg-slate-500` | `bg-slate-500/10` | `text-slate-400` |
| `processing` | `bg-sky-500 animate-pulse` | `bg-sky-500/10` | `text-sky-400` |

- Dot: `w-2 h-2 rounded-full` inline before label
- Container: `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium`

### 4.12 Notification Bell with Badge

Activity count indicator with dropdown notification feed.

**Implementation:**

```tsx
<NotificationBell
  unreadCount={3}
  notifications={NotificationItem[]}
  onMarkRead={(id) => {}}
  onClearAll={() => {}}
/>
```

**Specs:**
- Bell icon: `w-5 h-5 text-secondary`
- Badge: `absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full`
- Badge animates in with `scale-in` when count changes
- Dropdown: glass panel, max 5 recent items, "View all" link at bottom
- Notification item: icon + title + time ago, unread has left accent border

### 4.13 Collapsible Section Card

Expandable card sections for dense portfolio data views.

**Implementation:**

```tsx
<CollapsibleCard
  title="Options Positions"
  subtitle="4 active contracts"
  defaultOpen={true}
>
  {/* children */}
</CollapsibleCard>
```

**Specs:**
- Header: flex between title and chevron icon
- Chevron: rotates 180° on expand/collapse (`transition-transform duration-200`)
- Content: `animate-accordion-down` / `animate-accordion-up` via Radix Accordion
- Border: consistent with card surface tokens
- Nested collapse supported (accordion groups)

### 4.14 Dot Matrix Activity Chart

Monthly or yearly activity visualization as a dot-density grid (GitHub contribution graph style).

**Implementation:**

```tsx
<DotMatrixActivity
  data={[{ date: "2026-03-17", count: 5, value: 12500 }]}
  period="year"
  colorScale={["#1A1A24", "#22C55E"]}
/>
```

**Specs:**
- Grid: 52 columns (weeks) x 7 rows (days) for year view
- Dot size: 10x10px with 2px gap
- Color intensity: 5 levels from bg-card to accent-primary
- Tooltip on hover: date, trade count, total volume
- Month labels above, day labels (M, W, F) on left

### 4.15 Multi-Currency Display

Currency cards showing balances with live conversion rates.

**Implementation:**

```tsx
<MultiCurrencyDisplay
  balances={[
    { currency: "INR", amount: 2457832, flag: "🇮🇳" },
    { currency: "USD", amount: 29450, flag: "🇺🇸" },
    { currency: "BTC", amount: 0.45, flag: "₿" },
  ]}
  baseCurrency="INR"
/>
```

**Specs:**
- Horizontal scroll on mobile, grid on desktop
- Each card: flag/icon + currency code + balance + conversion rate
- Live rate indicator: subtle pulse dot when rate is updating
- Balance: `font-mono text-xl font-bold`
- Conversion: `text-xs text-muted` showing rate vs base currency

### 4.16 Day-of-Week Selector

Circular day indicators for filtering weekly analysis views.

**Implementation:**

```tsx
<DayOfWeekSelector
  selected={["Mon", "Wed", "Fri"]}
  onChange={(days) => {}}
/>
```

**Specs:**
- 7 circles in a row: `w-8 h-8 rounded-full`
- Active: `bg-accent-primary text-bg-primary`
- Inactive: `bg-white/5 text-muted` (dark) or `bg-slate-100 text-slate-500` (light)
- Multi-select supported (toggle on click)
- Label: single letter (M, T, W, T, F, S, S)

### 4.17 Onboarding Progress Stepper

Step-by-step setup flow with circular progress indicators.

**Implementation:**

```tsx
<OnboardingStepper
  steps={[
    { label: "Account", status: "completed" },
    { label: "KYC", status: "completed" },
    { label: "Bank Link", status: "current" },
    { label: "Preferences", status: "upcoming" },
  ]}
/>
```

**Specs:**
- Horizontal on desktop, vertical on mobile
- Step circle: `w-10 h-10 rounded-full border-2`
- Completed: `bg-accent-primary border-accent-primary` with checkmark icon
- Current: `border-accent-primary` with pulsing ring, step number inside
- Upcoming: `border-white/20 text-muted` (dark) or `border-slate-300` (light)
- Connector line: solid for completed, dashed for upcoming
- Label below circle: `text-xs font-medium`

---

## 5. Layout Patterns

### Dashboard Grid

Responsive CSS Grid configuration for the main dashboard surface.

| Breakpoint | Columns | Sidebar | Behavior |
|------------|---------|---------|----------|
| `< 640px` (mobile) | 1 | Hidden (bottom nav) | Cards stack vertically, full-width |
| `640-1024px` (tablet) | 2 | Collapsed (icon-only) | 2-column card grid |
| `1024-1440px` (desktop) | 3-4 | Expanded (icon + text) | Full dashboard layout |
| `> 1440px` (widescreen) | 4+ panels | Expanded | Trading cockpit, multi-panel |

```tsx
// Tailwind grid classes
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
  {/* dashboard cards */}
</div>
```

### Navigation

**Sidebar:**
- Width: 240px expanded, 64px collapsed
- Toggle: hamburger icon or `Ctrl+B` / `Cmd+B`
- Items: icon (always visible) + label (hidden when collapsed)
- Active item: left accent border + `bg-white/5` highlight
- Sections: grouped with `text-xs text-muted uppercase` headers

**Top Bar:**
- Height: 56px
- Contents: breadcrumbs (left) → search input (center) → notifications + profile (right)
- Sticky: `sticky top-0 z-50 backdrop-blur-xl`

**Command Palette:**
- Trigger: `Ctrl+K` / `Cmd+K`
- Full-screen overlay with search input
- Results grouped: Pages, Instruments, Actions, Recent
- Keyboard navigation: arrow keys + Enter

### Card Sizes

| Size | Grid Span | Use Case | Example |
|------|-----------|----------|---------|
| `sm` | 1 col | Single metric | Today's P&L, market status |
| `md` | 1 col | Chart + metric | Sparkline with value |
| `lg` | 2 cols | Interactive chart | Candlestick chart, heatmap |
| `xl` | Full width | Complex viz / table | Data table, multi-chart panel |

---

## 6. Animation & Micro-Interactions

### Principles

- Animations communicate **state changes**, not decoration
- All animations respect `prefers-reduced-motion: reduce`
- Performance: use `transform` and `opacity` only (GPU-composited properties)
- Duration guidelines: interactions < 200ms, transitions 200-500ms, entrances 300-700ms

### Catalog

| Interaction | Animation | Duration | Easing |
|-------------|-----------|----------|--------|
| Value change (P&L) | Number morph + brief color flash | `300ms` | `ease-out` |
| Card mount | Fade in + slide up from 16px | `500ms` | `ease-out` |
| Chart data update | Interpolate to new data points | `700ms` | `ease-out` |
| Button press | Scale to 0.97 then back | `150ms` | `ease-in-out` |
| Hover card | Border brighten + subtle lift | `200ms` | `ease-out` |
| Toggle switch | Pill slides with spring | `200ms` | `spring(1, 80, 10)` |
| Modal open | Backdrop fade + content scale from 0.95 | `300ms` | `ease-out` |
| Notification toast | Slide in from top-right | `400ms` | `ease-out` |
| Toast auto-dismiss | Slide out to right | `300ms` after `5s` | `ease-in` |

### Loading States

- **Skeleton shimmer**: pulsing gradient overlay on placeholder shapes (never spinners)
- Skeleton matches the component layout it replaces
- Shimmer: `animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5`

### Framer Motion Presets

```tsx
export const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export const staggerContainer = {
  visible: { transition: { staggerChildren: 0.08 } },
};
```

---

## 7. Chart Library Usage

| Chart Type | Library | Use Case | Notes |
|------------|---------|----------|-------|
| Line / Area / Bar | **Recharts** | P&L curves, volume bars, comparisons | Tree-shakeable, React-native |
| Candlestick / OHLC | **Lightweight Charts** (TradingView) | Price action, technical analysis | WebGL-accelerated, handles 10k+ candles |
| 3D Surface | **Plotly.js** | Volatility surface, Greeks 3D | Load dynamically (`next/dynamic`) |
| Sunburst / Sankey | **D3.js** | Asset allocation drill-down, capital flow | Custom React wrappers |
| Heatmap | **Recharts** or **Plotly** | P&L calendar, correlation matrix, Greeks table | Recharts for simple, Plotly for interactive |
| Gauge | **Custom SVG** | Risk score, margin utilization | Lightweight, no library dependency |
| Treemap | **Recharts** | Sector/industry allocation | Built-in Recharts component |
| Donut / Pie | **Recharts** | Portfolio allocation breakdown | Custom active shape for interactivity |
| Sparkline | **Recharts** (minimal) | Inline trend indicators | Stripped-down: no axes, no labels |

### Chart Theming

All charts must read from CSS custom properties for colors so theme switching works automatically.

```tsx
const chartTheme = {
  dark: {
    background: "transparent",
    gridColor: "rgba(255,255,255,0.05)",
    textColor: "#94A3B8",
    profitColor: "#22C55E",
    lossColor: "#EF4444",
  },
  light: {
    background: "transparent",
    gridColor: "#E2E8F0",
    textColor: "#475569",
    profitColor: "#16A34A",
    lossColor: "#DC2626",
  },
};
```

---

## 8. Accessibility

### Standards

- **WCAG 2.1 AA** compliance minimum across all components
- Target **AAA** for critical financial data display

### Requirements

| Area | Requirement | Implementation |
|------|-------------|----------------|
| **Color Contrast** | Minimum 4.5:1 for normal text, 3:1 for large text | Verified via both themes |
| **Keyboard Navigation** | All interactive elements reachable via Tab | Logical tab order, visible focus ring |
| **Focus Indicators** | Visible ring on all focusable elements | `focus-visible:ring-2 ring-accent-primary ring-offset-2 ring-offset-bg-primary` |
| **Screen Readers** | All charts have text summaries | `aria-label` with data summary on chart containers |
| **Reduced Motion** | Respect system preference | `@media (prefers-reduced-motion: reduce)` disables animations |
| **Color Independence** | Never use color alone to convey meaning | Icons/text accompany all color indicators (arrows for P&L, dots for status) |
| **Touch Targets** | Minimum 44x44px for touch | Enforced on all interactive elements |

### Chart Accessibility

Every chart component must include:

```tsx
<div
  role="img"
  aria-label="Portfolio value chart showing 5.28% gain over the past week, 
              current value ₹24,57,832"
>
  {/* chart renders here */}
</div>
```

### Screen Reader Announcements

Live financial data changes announced via `aria-live="polite"`:

```tsx
<div aria-live="polite" className="sr-only">
  Portfolio value updated: ₹24,57,832, up 5.28% this week
</div>
```

---

## 9. Related Documents

| Document | Path | Description |
|----------|------|-------------|
| Architecture | [ARCHITECTURE.md](ARCHITECTURE.md) | UFOS module architecture and system design |
| Feature Roadmap | [FEATURE_ROADMAP.md](FEATURE_ROADMAP.md) | 30+ planned features and milestones |
| Quick Start | [QUICKSTART.md](QUICKSTART.md) | Development environment setup |
| Project Structure | [STRUCTURE.md](STRUCTURE.md) | File and folder organization |
| Authentication | [AUTHENTICATION.md](AUTHENTICATION.md) | Auth flow and provider setup |
| Advanced Patterns | [ADVANCED_IMPLEMENTATION_PATTERN.md](ADVANCED_IMPLEMENTATION_PATTERN.md) | Implementation patterns and recipes |
