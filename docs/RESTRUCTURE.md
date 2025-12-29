# Complete Next.js 16 Frontend Architecture

## Investment Trading Portfolio - Feature-Complete Restructure

> **Production-ready architecture with Bento grids, AI-powered insights, and multi-tenant support**

---

## 🎯 Architecture Philosophy

### Core Principles from Analysis

1. **Bento Grid Everywhere**: Modular, tile-based layouts that adapt seamlessly
2. **Intelligence as Infrastructure**: AI-powered insights, not chatbots
3. **Command Center Approach**: Unified search, notifications, and AI
4. **Multi-Tenant by Design**: Retail, Family, Business support built-in
5. **Parallel Routes for Performance**: Independent loading of dashboard widgets
6. **Intercepted Routes for UX**: Modal-first interactions with fallback pages

---

## 📁 Complete File Structure

```
apps/web/
├── app/
│   ├── (auth)/                                    # Authentication Group
│   │   ├── layout.tsx                             # Minimal auth layout (no sidebar)
│   │   ├── loading.tsx                            # Global auth loading state
│   │   ├── error.tsx                              # Auth error boundary
│   │   │
│   │   ├── login/
│   │   │   ├── page.tsx                           # Multi-method login
│   │   │   ├── loading.tsx                        # Login loading state
│   │   │   └── error.tsx                          # Login error boundary
│   │   │
│   │   ├── register/
│   │   │   ├── page.tsx                           # Registration with entity type selection
│   │   │   ├── loading.tsx
│   │   │   └── error.tsx
│   │   │
│   │   ├── verify-email/
│   │   │   └── page.tsx                           # Email verification
│   │   │
│   │   ├── verify-otp/
│   │   │   ├── page.tsx                           # OTP verification
│   │   │   └── error.tsx                          # OTP error handling
│   │   │
│   │   ├── magic-link/
│   │   │   └── page.tsx                           # Magic link callback
│   │   │
│   │   ├── oauth/
│   │   │   └── callback/
│   │   │       ├── page.tsx                       # OAuth callback (Google, Upstox)
│   │   │       └── error.tsx                      # OAuth error handling
│   │   │
│   │   ├── device-auth/
│   │   │   ├── page.tsx                           # Device authorization flow
│   │   │   └── verify/
│   │   │       └── page.tsx                       # Verify device code
│   │   │
│   │   ├── 2fa/
│   │   │   ├── setup/
│   │   │   │   └── page.tsx                       # Setup 2FA
│   │   │   └── verify/
│   │   │       └── page.tsx                       # Verify 2FA code
│   │   │
│   │   ├── passkey/
│   │   │   ├── register/
│   │   │   │   └── page.tsx                       # Register passkey
│   │   │   └── authenticate/
│   │   │       └── page.tsx                       # Authenticate with passkey
│   │   │
│   │   └── session-expired/
│   │       └── page.tsx                           # Session timeout redirect
│   │
│   ├── (onboarding)/                              # First-time setup
│   │   ├── layout.tsx                             # Onboarding progress layout
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   │
│   │   ├── welcome/
│   │   │   └── page.tsx                           # Welcome screen
│   │   │
│   │   ├── entity-type/
│   │   │   └── page.tsx                           # Select: Retail/Family/Business
│   │   │
│   │   ├── workspace-setup/
│   │   │   ├── page.tsx                           # Create first workspace
│   │   │   ├── retail/
│   │   │   │   └── page.tsx                       # Retail-specific setup
│   │   │   ├── family/
│   │   │   │   └── page.tsx                       # Family setup with members
│   │   │   └── business/
│   │   │       └── page.tsx                       # Business setup with branches
│   │   │
│   │   ├── account-linking/
│   │   │   └── page.tsx                           # Link bank accounts
│   │   │
│   │   └── complete/
│   │       └── page.tsx                           # Onboarding complete
│   │
│   ├── (dashboard)/                               # Main Application (requires workspace)
│   │   ├── layout.tsx                             # Root dashboard layout (sidebar, command center)
│   │   ├── loading.tsx                            # Dashboard-wide loading
│   │   ├── error.tsx                              # Dashboard error boundary
│   │   ├── default.tsx                            # Default parallel route fallback
│   │   │
│   │   ├── (home)/                                # Dashboard Home with Bento Grid
│   │   │   ├── page.tsx                           # Main dashboard orchestrator
│   │   │   ├── loading.tsx                        # Home loading skeleton
│   │   │   ├── error.tsx                          # Home error boundary
│   │   │   │
│   │   │   ├── @networth/                         # Parallel: Net Worth Widget
│   │   │   │   ├── page.tsx                       # Net worth card (RSC)
│   │   │   │   ├── loading.tsx                    # Skeleton for net worth
│   │   │   │   └── error.tsx                      # Net worth error fallback
│   │   │   │
│   │   │   ├── @pulse/                            # Parallel: Pulse Indicators (MRR, Runway)
│   │   │   │   ├── page.tsx                       # 4 micro-visualization cards
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   │
│   │   │   ├── @cashflow/                         # Parallel: Cash Flow Waterfall
│   │   │   │   ├── page.tsx                       # Waterfall chart widget
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   │
│   │   │   ├── @expenses/                         # Parallel: Recent Expenses
│   │   │   │   ├── page.tsx                       # Expense breakdown pie chart
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   │
│   │   │   ├── @investments/                      # Parallel: Investment Performance
│   │   │   │   ├── page.tsx                       # Portfolio allocation sunburst
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   │
│   │   │   ├── @alerts/                           # Parallel: AI Alerts & Insights
│   │   │   │   ├── page.tsx                       # Anomaly detection cards
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   │
│   │   │   ├── @goals/                            # Parallel: Goal Progress
│   │   │   │   ├── page.tsx                       # Radial progress gauges
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   │
│   │   │   ├── @quickactions/                     # Parallel: Quick Actions
│   │   │   │   ├── page.tsx                       # Action cards (Add Expense, etc.)
│   │   │   │   └── loading.tsx
│   │   │   │
│   │   │   └── layout.tsx                         # Bento grid layout coordinator
│   │   │
│   │   ├── networth/                              # Net Worth Module
│   │   │   ├── layout.tsx                         # Net worth module layout
│   │   │   ├── page.tsx                           # Net worth dashboard
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   │
│   │   │   ├── @chart/                            # Parallel: Historical Chart
│   │   │   │   ├── page.tsx                       # Line chart with AI predictions
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   │
│   │   │   ├── @breakdown/                        # Parallel: Asset Breakdown
│   │   │   │   ├── page.tsx                       # Treemap/Sunburst
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   │
│   │   │   ├── @liabilities/                      # Parallel: Liabilities
│   │   │   │   ├── page.tsx                       # Liability cards
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   │
│   │   │   ├── @timeline/                         # Parallel: Historical Timeline
│   │   │   │   ├── page.tsx                       # Snapshot timeline
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   │
│   │   │   ├── layout.tsx                         # Parallel routes layout
│   │   │   │
│   │   │   └── snapshots/
│   │   │       ├── page.tsx                       # Snapshots list
│   │   │       ├── loading.tsx
│   │   │       └── [date]/
│   │   │           ├── page.tsx                   # Full snapshot page
│   │   │           ├── loading.tsx
│   │   │           └── error.tsx
│   │   │
│   │   ├── investments/                           # Investment Portfolio Module
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                           # Investment overview (Bento grid)
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   │
│   │   │   ├── @allocation/                       # Parallel: Asset Allocation
│   │   │   │   ├── page.tsx                       # Sunburst chart
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   │
│   │   │   ├── @performance/                      # Parallel: Portfolio Performance
│   │   │   │   ├── page.tsx                       # Line chart with benchmarks
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   │
│   │   │   ├── @holdings/                         # Parallel: Holdings Table
│   │   │   │   ├── page.tsx                       # Virtualized table
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   │
│   │   │   ├── layout.tsx
│   │   │   │
│   │   │   ├── stocks/
│   │   │   │   ├── page.tsx                       # Stocks list
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── error.tsx
│   │   │   │   ├── [symbol]/
│   │   │   │   │   ├── page.tsx                   # Stock detail with candlestick
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   └── error.tsx
│   │   │   │   └── add/
│   │   │   │       └── page.tsx                   # Add stock holding
│   │   │   │
│   │   │   ├── mutual-funds/
│   │   │   │   ├── page.tsx                       # Mutual funds list
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── [folio]/
│   │   │   │   │   ├── page.tsx                   # Fund detail
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   └── error.tsx
│   │   │   │   └── add/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── bonds/
│   │   │   │   ├── page.tsx                       # Bonds portfolio
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── [bondId]/
│   │   │   │   │   └── page.tsx                   # Bond detail
│   │   │   │   └── add/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── physical/                          # Physical Assets
│   │   │   │   ├── page.tsx                       # Physical assets overview
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── gold/
│   │   │   │   │   └── page.tsx                   # Gold holdings
│   │   │   │   ├── silver/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── vehicles/
│   │   │   │   │   ├── page.tsx                   # Vehicle list
│   │   │   │   │   ├── [vehicleId]/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── add/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── properties/
│   │   │   │   │   ├── page.tsx                   # Real estate
│   │   │   │   │   ├── [propertyId]/
│   │   │   │   │   │   ├── page.tsx               # Property detail with valuation
│   │   │   │   │   │   └── error.tsx
│   │   │   │   │   └── add/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── others/
│   │   │   │       └── page.tsx                   # Electronics, cash, etc.
│   │   │   │
│   │   │   ├── debt-instruments/                  # Debt Investments
│   │   │   │   ├── page.tsx                       # FD, RD, Bank accounts
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── fixed-deposits/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── add/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── recurring-deposits/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── bank-accounts/
│   │   │   │       ├── page.tsx
│   │   │   │       └── [accountId]/
│   │   │   │           └── page.tsx
│   │   │   │
│   │   │   ├── retirement/                        # Retirement Accounts
│   │   │   │   ├── page.tsx                       # NPS, EPF overview
│   │   │   │   ├── nps/
│   │   │   │   │   └── page.tsx                   # NPS details
│   │   │   │   └── epf/
│   │   │   │       └── page.tsx                   # EPF details
│   │   │   │
│   │   │   ├── crypto/
│   │   │   │   ├── page.tsx                       # Crypto portfolio (DeFi style)
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── @portfolio/                    # Parallel: Portfolio sunburst
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   └── error.tsx
│   │   │   │   ├── @gas/                          # Parallel: Gas tracker
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── loading.tsx
│   │   │   │   ├── @yields/                       # Parallel: Yield farming
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── loading.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── [asset]/
│   │   │   │   │   ├── page.tsx                   # Crypto asset detail
│   │   │   │   │   └── error.tsx
│   │   │   │   └── wallet/
│   │   │   │       └── page.tsx                   # Wallet management
│   │   │   │
│   │   │   ├── sips/                              # SIP Management
│   │   │   │   ├── page.tsx                       # Active SIPs tracker
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── [sipId]/
│   │   │   │   │   └── page.tsx                   # SIP detail
│   │   │   │   └── new/
│   │   │   │       └── page.tsx                   # Create SIP
│   │   │   │
│   │   │   └── analytics/
│   │   │       ├── page.tsx                       # Investment analytics
│   │   │       ├── xirr/
│   │   │       │   └── page.tsx                   # XIRR calculator
│   │   │       └── cagr/
│   │   │           └── page.tsx                   # CAGR by asset class
│   │   │
│   │   ├── liabilities/                           # Liabilities Module
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                           # Liabilities overview
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   │
│   │   │   ├── @breakdown/                        # Parallel: Debt breakdown
│   │   │   │   ├── page.tsx                       # Pie chart
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   │
│   │   │   ├── @schedule/                         # Parallel: Payment schedule
│   │   │   │   ├── page.tsx                       # Timeline/Gantt
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   │
│   │   │   ├── layout.tsx
│   │   │   │
│   │   │   ├── loans/
│   │   │   │   ├── page.tsx                       # Loans list
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── home-loans/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [loanId]/
│   │   │   │   │       ├── page.tsx               # Loan detail
│   │   │   │   │       ├── prepayment-calculator/
│   │   │   │   │       │   └── page.tsx           # ROI-based prepayment
│   │   │   │   │       └── error.tsx
│   │   │   │   ├── vehicle-loans/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── personal-loans/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── add/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── emis/
│   │   │   │   ├── page.tsx                       # EMI tracker
│   │   │   │   ├── upcoming/
│   │   │   │   │   └── page.tsx                   # Upcoming payments
│   │   │   │   └── calendar/
│   │   │   │       └── page.tsx                   # Payment calendar
│   │   │   │
│   │   │   ├── credit-cards/
│   │   │   │   ├── page.tsx                       # Credit card debt
│   │   │   │   ├── [cardId]/
│   │   │   │   │   └── page.tsx                   # Card detail
│   │   │   │   └── add/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   └── optimizer/
│   │   │       ├── page.tsx                       # Debt optimization hub
│   │   │       ├── snowball/
│   │   │       │   └── page.tsx                   # Snowball visualizer
│   │   │       ├── avalanche/
│   │   │       │   └── page.tsx                   # Avalanche visualizer
│   │   │       └── arbitrage/
│   │   │           └── page.tsx                   # Investment vs loan arbitrage
│   │   │
│   │   ├── insurance/                             # Insurance Module
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                           # Insurance overview
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   │
│   │   │   ├── term/
│   │   │   │   ├── page.tsx                       # Term insurance list
│   │   │   │   ├── [policyId]/
│   │   │   │   │   ├── page.tsx                   # Policy detail
│   │   │   │   │   └── error.tsx
│   │   │   │   └── add/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── life/
│   │   │   │   └── page.tsx                       # Life insurance
│   │   │   │
│   │   │   ├── health/
│   │   │   │   ├── page.tsx                       # Health insurance
│   │   │   │   └── [policyId]/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── vehicle/
│   │   │   │   └── page.tsx                       # Vehicle insurance
│   │   │   │
│   │   │   └── gap-analysis/
│   │   │       └── page.tsx                       # Insurance gap calculator
│   │   │
│   │   ├── expenses/                              # Expense Management Module
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                           # Expense dashboard (Bento)
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   │
│   │   │   ├── @trends/                           # Parallel: Spending trends
│   │   │   │   ├── page.tsx                       # Line chart
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   │
│   │   │   ├── @breakdown/                        # Parallel: Category breakdown
│   │   │   │   ├── page.tsx                       # Color-coded pie
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   │
│   │   │   ├── @insights/                         # Parallel: AI insights
│   │   │   │   ├── page.tsx                       # Smart briefs
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   │
│   │   │   ├── @budget/                           # Parallel: Budget vs actual
│   │   │   │   ├── page.tsx                       # Progress bars
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   │
│   │   │   ├── layout.tsx
│   │   │   │
│   │   │   ├── transactions/
│   │   │   │   ├── page.tsx                       # Transactions list (virtualized)
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── error.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx                   # Add transaction
│   │   │   │   ├── bulk-add/
│   │   │   │   │   └── page.tsx                   # Bulk transaction entry
│   │   │   │   ├── upload/
│   │   │   │   │   ├── page.tsx                   # Upload bank statement
│   │   │   │   │   └── processing/
│   │   │   │   │       └── [uploadId]/
│   │   │   │   │           └── page.tsx           # Statement processing status
│   │   │   │   ├── map/
│   │   │   │   │   └── page.tsx                   # Map transactions to assets/SIPs
│   │   │   │   └── [transactionId]/
│   │   │   │       ├── page.tsx                   # Transaction detail
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx
│   │   │   │
│   │   │   ├── categories/
│   │   │   │   ├── page.tsx                       # Category management
│   │   │   │   ├── [categoryId]/
│   │   │   │   │   └── page.tsx                   # Category drill-down
│   │   │   │   └── manage/
│   │   │   │       └── page.tsx                   # Create/edit categories
│   │   │   │
│   │   │   ├── budgets/
│   │   │   │   ├── page.tsx                       # Budgets dashboard
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx                   # Create budget
│   │   │   │   └── [budgetId]/
│   │   │   │       ├── page.tsx                   # Budget detail
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx
│   │   │   │
│   │   │   ├── splits/                            # Expense Splitting
│   │   │   │   ├── page.tsx                       # Active splits
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx                   # Create split
│   │   │   │   ├── [splitId]/
│   │   │   │   │   ├── page.tsx                   # Split detail
│   │   │   │   │   ├── settle/
│   │   │   │   │   │   └── page.tsx               # Settle split
│   │   │   │   │   └── error.tsx
│   │   │   │   └── friends/
│   │   │   │       └── page.tsx                   # Manage friends list
│   │   │   │
│   │   │   ├── analytics/
│   │   │   │   ├── page.tsx                       # Expense analytics
│   │   │   │   ├── reports/
│   │   │   │   │   └── page.tsx                   # Downloadable reports
│   │   │   │   └── predictions/
│   │   │   │       └── page.tsx                   # AI spending predictions
│   │   │   │
│   │   │   └── savings-tips/
│   │   │       └── page.tsx                       # AI savings recommendations
│   │   │
│   │   ├── lending/                               # Money Lent to Friends/Family
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                           # Lending overview
│   │   │   ├── loading.tsx
│   │   │   ├── active/
│   │   │   │   └── page.tsx                       # Active loans out
│   │   │   ├── repaid/
│   │   │   │   └── page.tsx                       # Repaid loans
│   │   │   ├── new/
│   │   │   │   └── page.tsx                       # Lend money
│   │   │   ├── [lendingId]/
│   │   │   │   ├── page.tsx                       # Lending detail
│   │   │   │   └── record-payment/
│   │   │   │       └── page.tsx                   # Record repayment
│   │   │   └── contacts/
│   │   │       └── page.tsx                       # Manage friends/family
│   │   │
│   │   ├── planning/                              # Planning & Experiments Module
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                           # Planning hub
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   │
│   │   │   ├── goals/
│   │   │   │   ├── page.tsx                       # Goals dashboard
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── @active/                       # Parallel: Active goals
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   └── error.tsx
│   │   │   │   ├── @completed/                    # Parallel: Completed goals
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── loading.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx                   # Create goal (with Monte Carlo)
│   │   │   │   └── [goalId]/
│   │   │   │       ├── page.tsx                   # Goal detail
│   │   │   │       ├── edit/
│   │   │   │       │   └── page.tsx
│   │   │   │       └── contributions/
│   │   │   │           └── page.tsx               # Track contributions
│   │   │   │
│   │   │   ├── plans/                             # Event Plans (Trip, Wedding, etc.)
│   │   │   │   ├── page.tsx                       # Plans list
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── new/
│   │   │   │   │   ├── page.tsx                   # Create plan wizard
│   │   │   │   │   └── loading.tsx
│   │   │   │   └── [planId]/
│   │   │   │       ├── page.tsx                   # Plan detail
│   │   │   │       ├── loading.tsx
│   │   │   │       ├── error.tsx
│   │   │   │       ├── edit/
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── items/
│   │   │   │       │   ├── page.tsx               # Plan items list
│   │   │   │       │   ├── new/
│   │   │   │       │   │   └── page.tsx           # Add item
│   │   │   │       │   └── [itemId]/
│   │   │   │       │       ├── page.tsx           # Item detail
│   │   │   │       │       └── comparison/
│   │   │   │       │           └── page.tsx       # Comparison tool
│   │   │   │       ├── timeline/
│   │   │   │       │   └── page.tsx               # Itinerary timeline
│   │   │   │       ├── budget/
│   │   │   │       │   └── page.tsx               # Plan budget tracker
│   │   │   │       └── transactions/
│   │   │   │           └── page.tsx               # Link transactions to plan
│   │   │   │
│   │   │   ├── comparisons/                       # Comparison Tools
│   │   │   │   ├── page.tsx                       # Comparisons hub
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx                   # Create comparison
│   │   │   │   └── [comparisonId]/
│   │   │   │       ├── page.tsx                   # Comparison detail
│   │   │   │       ├── items/
│   │   │   │       │   └── page.tsx               # Add comparison items
│   │   │   │       └── results/
│   │   │   │           └── page.tsx               # Comparison results
│   │   │   │
│   │   │   ├── legacy/                            # Legacy Planning
│   │   │   │   ├── page.tsx                       # Legacy planning overview
│   │   │   │   ├── beneficiaries/
│   │   │   │   │   ├── page.tsx                   # Manage beneficiaries
│   │   │   │   │   └── [beneficiaryId]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── digital-vault/
│   │   │   │   │   ├── page.tsx                   # Store documents
│   │   │   │   │   └── upload/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── dead-mans-switch/
│   │   │   │       ├── page.tsx                   # Setup inactivity alerts
│   │   │   │       └── configure/
│   │   │   │           └── page.tsx
│   │   │   │
│   │   │   ├── retirement/
│   │   │   │   ├── page.tsx                       # Retirement planner
│   │   │   │   └── monte-carlo/
│   │   │   │       └── page.tsx                   # Monte Carlo simulation
│   │   │   │
│   │   │   ├── rebalance/
│   │   │   │   └── page.tsx                       # Portfolio rebalance planner
│   │   │   │
│   │   │   └── experiments/
│   │   │       ├── page.tsx                       # Experiments list
│   │   │       ├── new/
│   │   │       │   ├── page.tsx                   # Create experiment
│   │   │       │   └── investment/
│   │   │       │       └── page.tsx               # Investment experiment
│   │   │       └── [experimentId]/
│   │   │           ├── page.tsx                   # Experiment detail
│   │   │           └── results/
│   │   │               └── page.tsx               # Experiment analytics
│   │   │
│   │   ├── trading/                               # Algorithmic Trading Module
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                           # Trading cockpit
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   │
│   │   │   ├── dashboard/                         # Live Trading Dashboard
│   │   │   │   ├── page.tsx                       # Trading dashboard orchestrator
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── error.tsx
│   │   │   │   │
│   │   │   │   ├── @greeks/                       # Parallel: Greeks visualization
│   │   │   │   │   ├── page.tsx                   # 3D volatility surface
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   └── error.tsx
│   │   │   │   │
│   │   │   │   ├── @positions/                    # Parallel: Active positions
│   │   │   │   │   ├── page.tsx                   # Positions table
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   └── error.tsx
│   │   │   │   │
│   │   │   │   ├── @pnl/                          # Parallel: P&L chart
│   │   │   │   │   ├── page.tsx                   # Real-time P&L
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   └── error.tsx
│   │   │   │   │
│   │   │   │   ├── @signals/                      # Parallel: AI signals
│   │   │   │   │   ├── page.tsx                   # ML predictions
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   └── error.tsx
│   │   │   │   │
│   │   │   │   ├── @latency/                      # Parallel: Latency monitoring
│   │   │   │   │   ├── page.tsx                   # Tick-to-trade latency
│   │   │   │   │   └── loading.tsx
│   │   │   │   │
│   │   │   │   └── layout.tsx
│   │   │   │
│   │   │   ├── config/                            # Trading Configuration
│   │   │   │   ├── page.tsx                       # Config hub
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── balance-limits/
│   │   │   │   │   └── page.tsx                   # Max loss, exposure limits
│   │   │   │   ├── instruments/
│   │   │   │   │   ├── page.tsx                   # Select instruments
│   │   │   │   │   └── configure/
│   │   │   │   │       └── [instrument]/
│   │   │   │   │           └── page.tsx
│   │   │   │   ├── strategies/
│   │   │   │   │   ├── page.tsx                   # Strategy list
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx               # Create strategy
│   │   │   │   │   ├── canvas/
│   │   │   │   │   │   └── page.tsx               # No-code strategy builder
│   │   │   │   │   └── [strategyId]/
│   │   │   │   │       ├── page.tsx               # Strategy detail
│   │   │   │   │       ├── edit/
│   │   │   │   │       │   └── page.tsx
│   │   │   │   │       ├── backtest/
│   │   │   │   │       │   └── page.tsx           # Backtest results
│   │   │   │   │       └── error.tsx
│   │   │   │   ├── schedule/
│   │   │   │   │   └── page.tsx                   # Trading days/hours
│   │   │   │   └── risk-rules/
│   │   │   │       └── page.tsx                   # Symbolic risk rules
│   │   │   │
│   │   │   ├── positions/
│   │   │   │   ├── page.tsx                       # All positions
│   │   │   │   ├── @active/                       # Parallel: Active
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── @closed/                       # Parallel: Closed
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   └── [positionId]/
│   │   │   │       ├── page.tsx                   # Position detail
│   │   │   │       └── error.tsx
│   │   │   │
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx                       # Order history
│   │   │   │   ├── [orderId]/
│   │   │   │   │   └── page.tsx                   # Order detail
│   │   │   │   └── error.tsx
│   │   │   │
│   │   │   ├── analytics/
│   │   │   │   ├── page.tsx                       # Trading analytics
│   │   │   │   ├── @performance/                  # Parallel: Performance metrics
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── @slippage/                     # Parallel: Slippage analysis
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── @sharpe/                       # Parallel: Sharpe ratio
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   └── reports/
│   │   │   │       └── page.tsx                   # Download reports
│   │   │   │
│   │   │   ├── market-insights/
│   │   │   │   ├── page.tsx                       # Market overview
│   │   │   │   ├── volatility/
│   │   │   │   │   └── page.tsx                   # IV surface, GEX
│   │   │   │   ├── options-chain/
│   │   │   │   │   └── page.tsx                   # Live options chain
│   │   │   │   └── max-pain/
│   │   │   │       └── page.tsx                   # Max pain analysis
│   │   │   │
│   │   │   ├── ai-models/
│   │   │   │   ├── page.tsx                       # Model monitoring
│   │   │   │   └── [modelId]/
│   │   │   │       ├── page.tsx                   # Model detail
│   │   │   │       └── shap/
│   │   │   │           └── page.tsx               # SHAP explainability
│   │   │   │
│   │   │   ├── kill-switch/
│   │   │   │   └── page.tsx                       # Emergency stop controls
│   │   │   │
│   │   │   └── experiments/
│   │   │       ├── page.tsx                       # Trading experiments
│   │   │       └── new/
│   │   │           └── page.tsx                   # Create experiment
│   │   │
│   │   ├── workspaces/                            # Workspace Management
│   │   │   ├── page.tsx                           # Workspace switcher
│   │   │   ├── loading.tsx
│   │   │   ├── new/
│   │   │   │   ├── page.tsx                       # Create workspace
│   │   │   │   ├── retail/
│   │   │   │   │   └── page.tsx                   # Retail setup
│   │   │   │   ├── family/
│   │   │   │   │   └── page.tsx                   # Family setup
│   │   │   │   └── business/
│   │   │   │       └── page.tsx                   # Business setup
│   │   │   │
│   │   │   └── [workspaceId]/
│   │   │       ├── page.tsx                       # Workspace dashboard
│   │   │       ├── loading.tsx
│   │   │       ├── error.tsx
│   │   │       │
│   │   │       ├── overview/                      # Workspace overview (entity-specific)
│   │   │       │   ├── page.tsx                   # Shows retail/family/business view
│   │   │       │   ├── loading.tsx
│   │   │       │   ├── @networth/                 # Parallel: Aggregated net worth
│   │   │       │   │   ├── page.tsx
│   │   │       │   │   └── loading.tsx
│   │   │       │   ├── @breakdown/                # Parallel: Member/team breakdown
│   │   │       │   │   ├── page.tsx
│   │   │       │   │   └── loading.tsx
│   │   │       │   └── layout.tsx
│   │   │       │
│   │   │       ├── aggregate/                     # Aggregation View
│   │   │       │   └── page.tsx                   # Family net worth sum / Business consolidated
│   │   │       │
│   │   │       ├── settings/
│   │   │       │   ├── page.tsx                   # Workspace settings
│   │   │       │   ├── general/
│   │   │       │   │   └── page.tsx               # Name, currency, fiscal year
│   │   │       │   ├── members/
│   │   │       │   │   ├── page.tsx               # Manage members
│   │   │       │   │   ├── invite/
│   │   │       │   │   │   └── page.tsx           # Invite members
│   │   │       │   │   └── [memberId]/
│   │   │       │   │       ├── page.tsx           # Member detail
│   │   │       │   │       └── permissions/
│   │   │       │   │           └── page.tsx       # Set permissions
│   │   │       │   ├── teams/                     # Teams/Sub-families/Branches
│   │   │       │   │   ├── page.tsx               # Teams list
│   │   │       │   │   ├── new/
│   │   │       │   │   │   └── page.tsx           # Create team
│   │   │       │   │   └── [teamId]/
│   │   │       │   │       ├── page.tsx           # Team detail
│   │   │       │   │       └── members/
│   │   │       │   │           └── page.tsx       # Team members
│   │   │       │   ├── permissions/
│   │   │       │   │   └── page.tsx               # RBAC matrix
│   │   │       │   └── danger/
│   │   │       │       └── page.tsx               # Delete workspace
│   │   │       │
│   │   │       └── analytics/
│   │   │           └── page.tsx                   # Workspace analytics
│   │   │
│   │   ├── account/                               # User Account
│   │   │   ├── page.tsx                           # Account overview
│   │   │   ├── profile/
│   │   │   │   └── page.tsx                       # Edit profile
│   │   │   ├── security/
│   │   │   │   ├── page.tsx                       # Security settings
│   │   │   │   ├── password/
│   │   │   │   │   └── page.tsx                   # Change password
│   │   │   │   ├── 2fa/
│   │   │   │   │   └── page.tsx                   # 2FA management
│   │   │   │   ├── passkeys/
│   │   │   │   │   └── page.tsx                   # Manage passkeys
│   │   │   │   └── sessions/
│   │   │   │       └── page.tsx                   # Active sessions
│   │   │   ├── linked-accounts/
│   │   │   │   ├── page.tsx                       # Linked accounts
│   │   │   │   └── connect/
│   │   │   │       └── [provider]/
│   │   │   │           └── page.tsx               # Connect provider
│   │   │   ├── api-credentials/
│   │   │   │   ├── page.tsx                       # API tokens
│   │   │   │   └── new/
│   │   │   │       └── page.tsx                   # Create token
│   │   │   ├── preferences/
│   │   │   │   └── page.tsx                       # App preferences
│   │   │   └── notifications/
│   │   │       └── page.tsx                       # Notification settings
│   │   │
│   │   ├── admin/                                 # Admin Dashboard
│   │   │   ├── layout.tsx                         # Admin layout
│   │   │   ├── page.tsx                           # Admin overview
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── page.tsx                       # User management
│   │   │   │   ├── [userId]/
│   │   │   │   │   ├── page.tsx                   # User detail
│   │   │   │   │   └── audit-log/
│   │   │   │   │       └── page.tsx               # User audit log
│   │   │   │   └── error.tsx
│   │   │   │
│   │   │   ├── workspaces/
│   │   │   │   ├── page.tsx                       # All workspaces
│   │   │   │   └── [workspaceId]/
│   │   │   │       └── page.tsx                   # Workspace admin view
│   │   │   │
│   │   │   ├── ai-models/
│   │   │   │   ├── page.tsx                       # All models
│   │   │   │   ├── @training/                     # Parallel: Training metrics
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── @inference/                    # Parallel: Inference stats
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── @drift/                        # Parallel: Model drift
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   └── [modelId]/
│   │   │   │       ├── page.tsx                   # Model MRI
│   │   │   │       └── activations/
│   │   │   │           └── page.tsx               # Layer activations
│   │   │   │
│   │   │   ├── system/
│   │   │   │   ├── page.tsx                       # System overview
│   │   │   │   ├── @metrics/                      # Parallel: System metrics
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── @errors/                       # Parallel: Error logs
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── @performance/                  # Parallel: Performance
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   └── health/
│   │   │   │       └── page.tsx                   # Health checks
│   │   │   │
│   │   │   ├── trading-engine/
│   │   │   │   ├── page.tsx                       # Engine monitoring
│   │   │   │   ├── latency/
│   │   │   │   │   └── page.tsx                   # Latency dashboard
│   │   │   │   └── circuit-breakers/
│   │   │   │       └── page.tsx                   # Circuit breaker status
│   │   │   │
│   │   │   └── compliance/
│   │   │       ├── page.tsx                       # Compliance dashboard
│   │   │       └── audit-trail/
│   │   │           └── page.tsx                   # Full audit trail
│   │   │
│   │   └── @modal/                                # Global Intercepted Routes
│   │       ├── (.)networth/
│   │       │   └── snapshots/
│   │       │       └── [date]/
│   │       │           └── page.tsx               # Snapshot modal
│   │       ├── (.)expenses/
│   │       │   └── transactions/
│   │       │       ├── new/
│   │       │       │   └── page.tsx               # Quick add transaction
│   │       │       └── [transactionId]/
│   │       │           └── page.tsx               # Transaction detail modal
│   │       ├── (.)investments/
│   │       │   └── stocks/
│   │       │       └── [symbol]/
│   │       │           └── page.tsx               # Quick stock view
│   │       ├── (.)planning/
│   │       │   ├── goals/
│   │       │   │   └── new/
│   │       │   │       └── page.tsx               # Quick create goal
│   │       │   └── comparisons/
│   │       │       └── [comparisonId]/
│   │       │           └── page.tsx               # Comparison modal
│   │       ├── (.)trading/
│   │       │   ├── config/
│   │       │   │   └── balance-limits/
│   │       │   │       └── page.tsx               # Quick edit limits
│   │       │   └── kill-switch/
│   │       │       └── page.tsx                   # Emergency stop modal
│   │       └── default.tsx                        # Modal fallback
│   │
│   ├── api/                                       # API Routes
│   │   ├── auth/
│   │   │   └── [...auth]/
│   │   │       └── route.ts                       # Better Auth handler
│   │   ├── trpc/
│   │   │   └── [trpc]/
│   │   │       └── route.ts                       # tRPC handler
│   │   ├── webhooks/
│   │   │   ├── account-aggregator/
│   │   │   │   └── route.ts                       # Account Aggregator webhook
│   │   │   ├── upstox/
│   │   │   │   └── route.ts                       # Upstox webhook
│   │   │   └── bank/
│   │   │       └── route.ts                       # Bank webhooks
│   │   ├── cron/
│   │   │   ├── snapshot/
│   │   │   │   └── route.ts                       # Daily snapshot cron
│   │   │   └── alerts/
│   │   │       └── route.ts                       # Alert processor
│   │   └── health/
│   │       └── route.ts                           # Health check
│   │
│   ├── layout.tsx                                 # Root layout
│   ├── loading.tsx                                # Global loading
│   ├── error.tsx                                  # Global error
│   ├── not-found.tsx                              # 404 page
│   └── global-error.tsx                           # Global error wrapper
│
├── components/                                    # Components
│   ├── ui/                                        # Base UI (shadcn)
│   │   ├── bento-card.tsx                         # Bento grid card
│   │   ├── glassmorphic-container.tsx             # Glassmorphism container
│   │   ├── clay-button.tsx                        # Claymorphism button
│   │   ├── command-palette.tsx                    # Cmd+K search
│   │   ├── skeleton-bento.tsx                     # Bento skeleton
│   │   └── ...
│   │
│   ├── bento/                                     # Bento Grid Components
│   │   ├── bento-grid.tsx                         # Grid layout
│   │   ├── bento-tile.tsx                         # Individual tile
│   │   └── bento-config.ts                        # Grid configuration
│   │
│   ├── charts/                                    # Chart Components
│   │   ├── net-worth-chart.tsx                    # Line chart with predictions
│   │   ├── waterfall-chart.tsx                    # Cash flow waterfall
│   │   ├── sunburst-chart.tsx                     # Asset allocation sunburst
│   │   ├── treemap-chart.tsx                      # Expense treemap
│   │   ├── volatility-surface.tsx                 # 3D volatility surface
│   │   ├── greeks-heatmap.tsx                     # Greeks heatmap
│   │   ├── candlestick-chart.tsx                  # Stock candlestick
│   │   ├── gauge-chart.tsx                        # Gauge/meter
│   │   ├── sparkline.tsx                          # Mini line chart
│   │   └── ...
│   │
│   ├── widgets/                                   # Dashboard Widgets
│   │   ├── net-worth-widget.tsx
│   │   ├── pulse-indicators.tsx                   # MRR, Runway cards
│   │   ├── cash-flow-widget.tsx
│   │   ├── expense-breakdown-widget.tsx
│   │   ├── investment-performance-widget.tsx
│   │   ├── alerts-widget.tsx                      # AI alerts
│   │   ├── goals-progress-widget.tsx
│   │   ├── quick-actions-widget.tsx
│   │   └── ...
│   │
│   ├── ai/                                        # AI Components
│   │   ├── ai-insight-card.tsx                    # AI-generated insight
│   │   ├── smart-brief.tsx                        # Text summary
│   │   ├── anomaly-detector.tsx                   # Anomaly card
│   │   ├── predictive-chart.tsx                   # Chart with predictions
│   │   └── text-to-chart.tsx                      # Natural language chart
│   │
│   ├── forms/                                     # Form Components
│   │   ├── transaction-form.tsx
│   │   ├── goal-form.tsx
│   │   ├── plan-form.tsx
│   │   ├── comparison-form.tsx
│   │   ├── strategy-form.tsx
│   │   └── ...
│   │
│   ├── tables/                                    # Table Components
│   │   ├── virtualized-transactions-table.tsx     # Infinite scroll table
│   │   ├── holdings-table.tsx
│   │   ├── positions-table.tsx
│   │   └── ...
│   │
│   ├── auth/                                      # Auth Components
│   │   ├── login-form.tsx
│   │   ├── register-form.tsx
│   │   ├── otp-input.tsx
│   │   ├── passkey-button.tsx
│   │   └── ...
│   │
│   ├── workspace/                                 # Workspace Components
│   │   ├── workspace-switcher.tsx
│   │   ├── workspace-card.tsx
│   │   ├── member-list.tsx
│   │   ├── team-card.tsx
│   │   ├── aggregation-view.tsx                   # Family/Business aggregation
│   │   └── ...
│   │
│   ├── layout/                                    # Layout Components
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   ├── command-center.tsx                     # Unified search/notifications
│   │   ├── breadcrumbs.tsx
│   │   └── ...
│   │
│   └── comparison/                                # Comparison Components
│       ├── comparison-table.tsx
│       ├── comparison-card.tsx
│       ├── weighting-slider.tsx
│       └── winner-badge.tsx
│
├── lib/                                           # Core Utilities
│   ├── trpc/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── react.tsx
│   ├── auth/
│   │   ├── client.ts
│   │   └── session.ts
│   ├── ai/
│   │   ├── text-to-chart.ts                       # LLM integration
│   │   ├── anomaly-detection.ts
│   │   └── predictions.ts
│   ├── workspace/
│   │   ├── aggregation.ts                         # Aggregation strategies
│   │   └── permissions.ts
│   ├── goals/
│   │   ├── calculator.ts                          # SIP/Monte Carlo
│   │   └── projections.ts
│   ├── utils.ts
│   ├── cn.ts
│   └── constants.ts
│
├── hooks/                                         # Custom Hooks
│   ├── use-auth.ts
│   ├── use-workspace.ts
│   ├── use-bento-layout.ts                        # Responsive Bento
│   ├── use-command-palette.ts
│   ├── use-ai-insights.ts
│   └── ...
│
├── store/                                         # State Management (Zustand)
│   ├── ui-store.ts
│   ├── workspace-store.ts
│   ├── trading-store.ts
│   ├── command-center-store.ts
│   └── ...
│
├── styles/
│   ├── globals.css
│   ├── bento.css
│   ├── glassmorphism.css
│   └── claymorphism.css
│
├── types/
│   ├── auth.ts
│   ├── workspace.ts
│   ├── entities.ts                                # Retail/Family/Business types
│   ├── comparison.ts
│   └── ...
│
├── middleware.ts
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 🎨 Design System: Bento + Morphism

### Bento Grid Configuration

```typescript
// components/bento/bento-config.ts
export const BENTO_LAYOUTS = {
  HOME_RETAIL: {
    desktop: [
      { i: "networth", x: 0, y: 0, w: 2, h: 1 }, // 2x1 (large)
      { i: "pulse", x: 2, y: 0, w: 2, h: 1 }, // 4 micro cards
      { i: "cashflow", x: 0, y: 1, w: 2, h: 2 }, // 2x2 (tall)
      { i: "expenses", x: 2, y: 1, w: 1, h: 1 }, // 1x1
      { i: "investments", x: 3, y: 1, w: 1, h: 1 }, // 1x1
      { i: "alerts", x: 2, y: 2, w: 2, h: 1 }, // 2x1
      { i: "goals", x: 0, y: 3, w: 1, h: 1 }, // 1x1
      { i: "quickactions", x: 1, y: 3, w: 3, h: 1 }, // 3x1
    ],
    mobile: [
      // Stack vertically by priority
      { i: "networth", x: 0, y: 0, w: 1, h: 1 },
      { i: "alerts", x: 0, y: 1, w: 1, h: 1 },
      { i: "pulse", x: 0, y: 2, w: 1, h: 1 },
      { i: "cashflow", x: 0, y: 3, w: 1, h: 1 },
      { i: "expenses", x: 0, y: 4, w: 1, h: 1 },
      { i: "investments", x: 0, y: 5, w: 1, h: 1 },
      { i: "goals", x: 0, y: 6, w: 1, h: 1 },
      { i: "quickactions", x: 0, y: 7, w: 1, h: 1 },
    ],
  },
  HOME_FAMILY: {
    // Similar but with @breakdown slot showing member contribution
  },
  HOME_BUSINESS: {
    // Similar but with P&L, revenue, cash runway
  },
};
```

### Glassmorphism Component

```typescript
// components/ui/glassmorphic-container.tsx
"use client";

import { cn } from "@/lib/utils";

interface GlassmorphicContainerProps {
  children: React.ReactNode;
  className?: string;
  blur?: "sm" | "md" | "lg";
}

export function GlassmorphicContainer({
  children,
  className,
  blur = "md",
}: GlassmorphicContainerProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/20 bg-white/10",
        "dark:bg-black/10 dark:border-white/10",
        blur === "sm" && "backdrop-blur-sm",
        blur === "md" && "backdrop-blur-md",
        blur === "lg" && "backdrop-blur-lg",
        "shadow-xl shadow-black/5",
        className
      )}
    >
      {children}
    </div>
  );
}
```

### Claymorphism Button

```typescript
// components/ui/clay-button.tsx
"use client";

import { cn } from "@/lib/utils";

export function ClayButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "rounded-2xl px-6 py-3 font-semibold",
        "bg-linear-to-br from-primary to-primary/80",
        "shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),inset_0_-1px_2px_rgba(0,0,0,0.1)]",
        "hover:shadow-[inset_0_1px_3px_rgba(255,255,255,0.4),inset_0_-1px_3px_rgba(0,0,0,0.15)]",
        "active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]",
        "transition-shadow duration-200",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
```

---

## 🧠 AI-Powered Features Implementation

### Command Center

```typescript
// components/layout/command-center.tsx
"use client";

import { useCommandPalette } from "@/hooks/use-command-palette";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function CommandCenter() {
  const { open, setOpen, results } = useCommandPalette();

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search or ask a question..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Suggestions">
          <CommandItem>Show me spending trends for last month</CommandItem>
          <CommandItem>What's my current net worth?</CommandItem>
          <CommandItem>Add new expense</CommandItem>
        </CommandGroup>

        <CommandGroup heading="Recent">
          {results.map((result) => (
            <CommandItem key={result.id}>
              {result.title}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="AI Insights">
          <CommandItem>You spent 25% more on dining this month</CommandItem>
          <CommandItem>Your portfolio is overweight in tech stocks</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
```

### Text-to-Chart Generator

```typescript
// lib/ai/text-to-chart.ts
export async function generateChartFromPrompt(prompt: string) {
  const response = await fetch("/api/ai/generate-chart", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });

  const { query, chartType, config } = await response.json();

  return {
    query, // SQL or API query
    chartType, // "line", "pie", "bar", etc.
    config, // Chart.js config
  };
}
```

---

## 📊 Entity-Specific Implementations

### Retail Dashboard

```typescript
// app/(dashboard)/(home)/page.tsx (Retail)
import { api } from "@/lib/trpc/server";
import { BentoGrid } from "@/components/bento/bento-grid";
import { BENTO_LAYOUTS } from "@/components/bento/bento-config";

export default async function RetailHomePage() {
  const workspace = await api.workspaces.getCurrent();

  if (workspace.type !== "RETAIL") {
    redirect("/workspaces");
  }

  return (
    <BentoGrid layout={BENTO_LAYOUTS.HOME_RETAIL}>
      {/* Parallel routes render here */}
    </BentoGrid>
  );
}
```

### Family Dashboard with Aggregation

```typescript
// app/(dashboard)/workspaces/[workspaceId]/aggregate/page.tsx
import { WorkspaceAggregator } from "@/lib/workspace/aggregation";
import { AggregatedNetWorthChart } from "@/components/charts/aggregated-networth-chart";

export default async function FamilyAggregatePage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const workspace = await api.workspaces.get({ id: params.workspaceId });
  const aggregator = new WorkspaceAggregator();
  const data = await aggregator.aggregate(workspace);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Net Worth Card */}
        <GlassmorphicContainer className="lg:col-span-2">
          <div className="p-6">
            <h3 className="text-sm text-muted-foreground">Family Net Worth</h3>
            <p className="text-4xl font-bold mt-2">
              ₹{data.netWorth.toLocaleString("en-IN")}
            </p>
            <AggregatedNetWorthChart breakdown={data.breakdown} />
          </div>
        </GlassmorphicContainer>

        {/* Member Breakdown */}
        <div className="space-y-4">
          {data.breakdown.map((member) => (
            <GlassmorphicContainer key={member.category}>
              <div className="p-4">
                <p className="text-sm font-medium">{member.category}</p>
                <p className="text-2xl font-bold">
                  ₹{member.value.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {((member.value / data.netWorth) * 100).toFixed(1)}% of total
                </p>
              </div>
            </GlassmorphicContainer>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 🎯 Comparison Tools Implementation

### Comparison Table

```typescript
// app/(dashboard)/planning/plans/[planId]/items/[itemId]/comparison/page.tsx
import { ComparisonTable } from "@/components/comparison/comparison-table";

export default async function ComparisonPage({
  params,
}: {
  params: { planId: string; itemId: string };
}) {
  const comparison = await api.comparisons.get({ itemId: params.itemId });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Hotel Comparison</h1>

      <ComparisonTable
        items={comparison.items}
        fields={comparison.fields}
        onUpdateWeights={(weights) => {
          // Update field weights
        }}
      />
    </div>
  );
}
```

---

## ✅ Implementation Checklist

### Phase 1: Foundation (Weeks 1-2)

- [ ] Set up Next.js 16 with App Router
- [ ] Configure Better Auth with organization plugin
- [ ] Set up tRPC client/server
- [ ] Implement Bento grid system
- [ ] Add Glassmorphism/Claymorphism components
- [ ] Create Command Center (Cmd+K)

### Phase 2: Core Features (Weeks 3-6)

- [ ] Net Worth module with parallel routes
- [ ] Investments module (all asset classes)
- [ ] Liabilities module with optimizer
- [ ] Expense Management with AI insights
- [ ] Insurance module

### Phase 3: Advanced Features (Weeks 7-10)

- [ ] Planning module (Goals, Plans, Experiments)
- [ ] Comparison tools
- [ ] Legacy planning
- [ ] Trading module with kill switch
- [ ] Lending module

### Phase 4: Multi-Tenancy (Weeks 11-12)

- [ ] Workspace aggregation
- [ ] Family/Business views
- [ ] Team permissions
- [ ] Member management

### Phase 5: Polish (Weeks 13-14)

- [ ] AI-powered insights everywhere
- [ ] Mobile optimization
- [ ] Performance optimization
- [ ] Testing & bug fixes

---

**Status**: Production-Ready Architecture
**Last Updated**: December 28, 2025
