# UFOS Feature Roadmap

> **Last Updated**: March 17, 2026  
> **Design Inspiration**: [Nixtio](https://dribbble.com/Nixtio)  
> **Design System**: See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)

## Overview

30+ features organized by module, prioritized for implementation. All features follow the UFOS Design System patterns and are built with Next.js 16 RSC, tRPC v11, and TailwindCSS + Shadcn/ui.

---

## Priority Legend

- P0: Must-have for MVP launch
- P1: High priority, planned for v1.0
- P2: Medium priority, planned for v1.5
- P3: Nice-to-have, future consideration

---

## Module 1: Wealth Dashboard

| Feature | Priority | Status | Description |
|---------|----------|--------|-------------|
| Portfolio Performance Hero Card | P0 | Planned | Large balance display (INR) with weekly/monthly profit %, sparkline trend. Inspired by Nixtio wallet value card |
| Multi-Currency Net Worth | P1 | Planned | Display net worth in INR/USD/EUR with live conversion rates and currency toggle |
| Interactive Donut/Sunburst Charts | P0 | Planned | Clickable asset allocation segments with drill-down, animated transitions |
| Capital Flow Dot Matrix | P2 | Planned | Monthly/yearly spending patterns as dot density chart |
| Transaction Timeline Feed | P0 | Planned | Color-coded list with status pills (Pending/Confirmed/Failed), time grouping |
| Goal-Based Progress Tracker | P1 | Planned | Financial goals with circular progress gauges and target countdown |
| Dividend Calendar | P2 | Planned | Calendar view of upcoming dividends with yield percentages |
| Insurance Coverage Radar | P2 | Planned | Spider chart comparing actual vs recommended coverage |
| Net Worth Time Machine | P1 | Planned | Historical net worth slider showing portfolio value at any past date |
| Tax Summary Dashboard | P1 | Planned | FY-wise capital gains (STCG/LTCG), tax liability estimate, harvesting suggestions |

---

## Module 2: Algorithmic Trading Cockpit

| Feature | Priority | Status | Description |
|---------|----------|--------|-------------|
| Realized vs Unrealized P&L Cards | P0 | Planned | Side-by-side metric cards with daily/weekly/monthly P&L and % change |
| Portfolio Risk Score Gauge | P0 | Planned | Semi-circular gauge (Low/Medium/High) with percentage breakdown |
| P&L Calendar Heatmap | P0 | Planned | Daily P&L as color-coded calendar cells (green profit, red loss) |
| Trade Journal with AI Analysis | P1 | Planned | Journaling module with AI pattern recognition across entries |
| Options Chain Visualizer | P1 | Planned | Interactive chain with inline P&L curves and breakeven viz |
| Strategy Performance Leaderboard | P0 | Planned | Card-based comparison of strategy returns, win rate, Sharpe, drawdown |
| Market Ticker Bar | P1 | Planned | Real-time scrolling ticker with index values, top movers, alerts |
| Time Period Toggle for All Charts | P0 | Planned | Universal 1H/8H/1D/1W/1M/6M/1Y toggle applied across all time-series |
| Sector Rotation Heatmap | P2 | Planned | Color-coded sector performance matrix with period comparison |
| Correlation Matrix Explorer | P2 | Planned | Interactive portfolio correlation heatmap with drill-down |
| Execution Quality Dashboard | P1 | Planned | Slippage tracking, fill rates, tick-to-trade latency by strategy |
| Greeks Command Center | P1 | Planned | 3D Volatility Surface, GEX Dashboard, Vanna/Charm heatmaps |

---

## Module 3: AI and Intelligence

| Feature | Priority | Status | Description |
|---------|----------|--------|-------------|
| AI Trading Assistant Chat | P1 | Planned | Natural language interface with quick action cards (Analyze, Explain, Suggest, Scan) |
| Predictive Market Alerts | P2 | Planned | AI notifications before earnings, policy decisions, technical breakouts |
| Tax Harvesting Assistant | P2 | Planned | AI suggestions for tax-loss harvesting with one-click execution |
| Portfolio Stress Tester | P1 | Planned | Scenario analysis (crash -20%, rate hike +200bps) with projected impact |
| AI Market Narrator | P2 | Planned | Real-time AI commentary on market movements and model decisions |
| Watchlist with AI Scoring | P1 | Planned | ML-derived composite scores for watchlist instruments |

---

## Module 4: Admin "God Mode"

| Feature | Priority | Status | Description |
|---------|----------|--------|-------------|
| System Overview Dashboard | P0 | Planned | Service health, active users, data pipeline status, error counts |
| User Management | P0 | Planned | List users, trading status, enable/disable trading, role management |
| Instrument Management | P0 | Planned | Search/filter instruments, enable/disable for trading/data collection |
| Trading Controls + Kill Switch | P0 | Planned | Global/per-user kill switch, circuit breaker status, position summary |
| Model Experiment Manager | P0 | Planned | Create experiments, tune hyperparameters, compare runs, deploy models |
| Training Run Monitor | P0 | Planned | Live training progress, per-stage metrics, duration, errors, artifacts |
| Data Pipeline Status | P0 | Planned | QuestDB data gaps, ingestion lag, feature computation status |
| Model Performance Dashboard | P1 | Planned | Live model accuracy, prediction vs actual, drift detection |
| AI Decision Trace | P1 | Planned | Decision path visualization with SHAP explainability |
| Audit Trail | P0 | Planned | Immutable log of all admin actions, trades, config changes |
| System Logs Viewer | P0 | Planned | Filterable log viewer with error highlighting, trace IDs |

---

## Module 5: Platform UX

| Feature | Priority | Status | Description |
|---------|----------|--------|-------------|
| Command Palette (Cmd+K) | P0 | Planned | Global search: positions, instruments, settings, actions |
| Guided Onboarding Wizard | P0 | Planned | Step-by-step: link broker, set risk limits, configure strategies |
| Multi-Screen Layout Manager | P2 | Planned | Save/switch layouts ("Trading Mode", "Analysis Mode", "Wealth Review") |
| Dark/Light Theme Toggle | P0 | Planned | System-aware with manual override, dark for trading, light for wealth |
| Personalized Welcome Dashboard | P0 | Planned | Greeting banner with daily metrics (P&L, portfolio, alerts, market status) |
| Quick Actions Hub | P0 | Planned | Configurable 2x3 action grid for frequent operations |
| Activity Heatmap | P2 | Planned | Weekly/monthly trading activity intensity visualization |
| Notification Center | P0 | Planned | Bell icon with categorized feed (Trades, Alerts, System, Admin) |
| Mobile-First PWA | P2 | Planned | Offline portfolio view, push notifications, biometric trade confirmation |
| Social/Team Trading Feed | P3 | Planned | Organization activity feed showing team trades and performance |

---

## Module 6: Document Intelligence

| Feature | Priority | Status | Description |
|---------|----------|--------|-------------|
| Document Scanner UI | P2 | Planned | Upload/scan bank statements, tax forms with AI extraction status |
| Smart Document Categorization | P2 | Planned | Auto-tagging by type, date, institution with filter UI |
| CAS Import | P1 | Planned | Import Consolidated Account Statement for MF/equity holdings |

---

## Implementation Phases

### Phase 1: Foundation (Current)
Auth flow, instrument management, data collection, feature computation, admin dashboard shell

### Phase 2: Trading Core
P0 trading cockpit features, execution quality, strategy leaderboard, P&L tracking

### Phase 3: Wealth + Intelligence
Wealth dashboard, AI assistant, tax features, document processing

### Phase 4: Polish + Scale
PWA, layout manager, team features, advanced AI features

---

## Technical Notes

- All features built as RSC (React Server Components) by default, `'use client'` only for interactivity
- Data fetching via tRPC with React Query for client-side cache
- Real-time updates via tRPC subscriptions (SSE) or WebSocket for tick data
- Charts: Recharts for standard, Plotly.js for 3D, D3.js for custom, Lightweight Charts for price
- State: Zustand for local UI, React Query for server state
- Testing: Vitest + React Testing Library for components, Playwright for E2E
