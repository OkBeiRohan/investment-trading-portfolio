# Next.js 16 Production Frontend Architecture

## Quantum Investments and Trades - Web Dashboard

> **Modern, scalable architecture leveraging Next.js 16 App Router, Better Auth, tRPC, and advanced React patterns**

---

## 🎯 Architecture Philosophy

### Core Principles

1. **Feature-First Organization**: Group by business domain, not technical layers
2. **Server-First Architecture**: Default to Server Components, strategically use Client Components
3. **Progressive Enhancement**: Work without JavaScript, enhance with interactivity
4. **Type Safety End-to-End**: Better Auth + tRPC + Zod for complete type safety
5. **Performance by Default**: Code splitting, streaming, parallel data fetching
6. **Accessibility First**: WCAG 2.1 AA compliance, keyboard navigation, screen readers

### Terminology

**"Workspace"** instead of "Organization":

- **Family Workspace**: Aggregate net worth of all members
- **Business Workspace**: Separate teams, branches, departments
- **Friends/Group Workspace**: Split expenses, shared goals
- **Solo Workspace**: Personal finance (default)

---

## 📁 Complete File Structure

```
apps/web/
├── app/
│   ├── (auth)/                          # Auth routes (no dashboard layout)
│   │   ├── layout.tsx                   # Minimal auth layout
│   │   ├── login/
│   │   │   ├── page.tsx                 # Login with all methods
│   │   │   ├── loading.tsx
│   │   │   └── error.tsx
│   │   ├── register/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   └── error.tsx
│   │   ├── verify-email/
│   │   │   └── page.tsx                 # Email verification
│   │   ├── verify-otp/
│   │   │   └── page.tsx                 # OTP verification
│   │   ├── magic-link/
│   │   │   └── page.tsx                 # Magic link callback
│   │   ├── oauth/
│   │   │   └── callback/
│   │   │       └── page.tsx             # OAuth callback (Upstox, Google)
│   │   ├── device-auth/
│   │   │   ├── page.tsx                 # Device authorization code entry
│   │   │   └── verify/
│   │   │       └── page.tsx             # Verify device
│   │   ├── 2fa/
│   │   │   ├── setup/
│   │   │   │   └── page.tsx             # Setup 2FA
│   │   │   └── verify/
│   │   │       └── page.tsx             # Verify 2FA code
│   │   ├── passkey/
│   │   │   ├── register/
│   │   │   │   └── page.tsx             # Register passkey
│   │   │   └── authenticate/
│   │   │       └── page.tsx             # Authenticate with passkey
│   │   ├── forgot-password/
│   │   │   └── page.tsx
│   │   ├── reset-password/
│   │   │   └── page.tsx
│   │   └── session-expired/
│   │       └── page.tsx                 # Session timeout redirect
│   │
│   ├── (onboarding)/                    # First-time user setup
│   │   ├── layout.tsx                   # Onboarding progress layout
│   │   ├── welcome/
│   │   │   └── page.tsx                 # Welcome screen
│   │   ├── workspace-setup/
│   │   │   └── page.tsx                 # Create first workspace
│   │   ├── account-linking/
│   │   │   └── page.tsx                 # Link bank accounts
│   │   ├── preferences/
│   │   │   └── page.tsx                 # Set preferences
│   │   └── complete/
│   │       └── page.tsx                 # Onboarding complete
│   │
│   ├── (dashboard)/                     # Main app (requires auth + workspace)
│   │   ├── layout.tsx                   # Root dashboard layout (sidebar, header)
│   │   ├── loading.tsx                  # Dashboard-wide loading state
│   │   ├── error.tsx                    # Dashboard-wide error boundary
│   │   ├── default.tsx                  # Default parallel route fallback
│   │   │
│   │   ├── (home)/                      # Dashboard home with parallel routes
│   │   │   ├── page.tsx                 # Overview dashboard
│   │   │   ├── @networth/
│   │   │   │   ├── page.tsx             # Net worth widget (parallel route)
│   │   │   │   └── loading.tsx
│   │   │   ├── @recentActivity/
│   │   │   │   ├── page.tsx             # Recent transactions widget
│   │   │   │   └── loading.tsx
│   │   │   ├── @quickActions/
│   │   │   │   └── page.tsx             # Quick action cards
│   │   │   ├── @alerts/
│   │   │   │   └── page.tsx             # Alerts/notifications widget
│   │   │   └── layout.tsx               # Parallel route layout
│   │   │
│   │   ├── wealth/                      # Wealth Management Module
│   │   │   ├── layout.tsx               # Wealth module layout
│   │   │   ├── page.tsx                 # Wealth overview
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   │
│   │   │   ├── networth/                # Net Worth Tracking
│   │   │   │   ├── page.tsx             # Net worth dashboard
│   │   │   │   ├── @chart/              # Parallel: Chart view
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── @breakdown/          # Parallel: Asset breakdown
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── @timeline/           # Parallel: Historical timeline
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   └── snapshot/
│   │   │   │       └── [date]/
│   │   │   │           └── page.tsx     # Historical snapshot view
│   │   │   │
│   │   │   ├── investments/             # Investment Tracking
│   │   │   │   ├── page.tsx             # Investments overview
│   │   │   │   ├── stocks/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [symbol]/
│   │   │   │   │       └── page.tsx     # Individual stock view
│   │   │   │   ├── mutual-funds/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [folio]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── bonds/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── crypto/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [asset]/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── ppf-nps/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── savings/                 # Savings & Emergency Funds
│   │   │   │   ├── page.tsx
│   │   │   │   ├── emergency-fund/
│   │   │   │   │   └── page.tsx         # Emergency fund calculator
│   │   │   │   └── accounts/
│   │   │   │       ├── page.tsx         # Linked bank accounts
│   │   │   │       └── [accountId]/
│   │   │   │           └── page.tsx     # Account details
│   │   │   │
│   │   │   ├── insurance/               # Insurance Management
│   │   │   │   ├── page.tsx
│   │   │   │   ├── life/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [policyId]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── health/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [policyId]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── vehicle/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── gap-analysis/
│   │   │   │       └── page.tsx         # Insurance gap calculator
│   │   │   │
│   │   │   ├── debts/                   # Debt Management
│   │   │   │   ├── page.tsx             # Debt overview
│   │   │   │   ├── loans/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [loanId]/
│   │   │   │   │       ├── page.tsx     # Loan details
│   │   │   │   │       └── prepayment-calculator/
│   │   │   │   │           └── page.tsx
│   │   │   │   ├── credit-cards/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── optimizer/
│   │   │   │       └── page.tsx         # Debt optimization (snowball/avalanche)
│   │   │   │
│   │   │   ├── real-estate/             # Real Estate Portfolio
│   │   │   │   ├── page.tsx
│   │   │   │   └── [propertyId]/
│   │   │   │       ├── page.tsx         # Property details
│   │   │   │       └── valuation/
│   │   │   │           └── page.tsx     # Property valuation tracker
│   │   │   │
│   │   │   ├── planner/                 # Financial Planning
│   │   │   │   ├── page.tsx             # Planner hub
│   │   │   │   ├── goals/
│   │   │   │   │   ├── page.tsx         # Goals dashboard
│   │   │   │   │   ├── @active/         # Parallel: Active goals
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── @completed/      # Parallel: Completed goals
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── layout.tsx
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx     # Create new goal
│   │   │   │   │   └── [goalId]/
│   │   │   │   │       ├── page.tsx     # Goal details
│   │   │   │   │       └── edit/
│   │   │   │   │           └── page.tsx
│   │   │   │   ├── retirement/
│   │   │   │   │   └── page.tsx         # Retirement planner (Monte Carlo)
│   │   │   │   ├── rebalance/
│   │   │   │   │   └── page.tsx         # Portfolio rebalance suggestions
│   │   │   │   └── projections/
│   │   │   │       └── page.tsx         # Future projections
│   │   │   │
│   │   │   ├── comparisons/             # Product Comparisons
│   │   │   │   ├── page.tsx             # Comparison hub
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx         # Create comparison
│   │   │   │   └── [comparisonId]/
│   │   │   │       └── page.tsx         # View comparison
│   │   │   │
│   │   │   ├── legacy/                  # Legacy Planning
│   │   │   │   ├── page.tsx             # Legacy planning overview
│   │   │   │   ├── beneficiaries/
│   │   │   │   │   └── page.tsx         # Manage beneficiaries
│   │   │   │   ├── digital-vault/
│   │   │   │   │   └── page.tsx         # Store important documents
│   │   │   │   └── dead-mans-switch/
│   │   │   │       └── page.tsx         # Setup inactivity alerts
│   │   │   │
│   │   │   └── @modal/                  # Intercepted routes for modals
│   │   │       ├── (.)networth/
│   │   │       │   └── snapshot/
│   │   │       │       └── [date]/
│   │   │       │           └── page.tsx # Snapshot modal
│   │   │       └── default.tsx
│   │   │
│   │   ├── expenses/                    # Expense Management Module
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                 # Expense overview
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   │
│   │   │   ├── transactions/            # Transaction Management
│   │   │   │   ├── page.tsx             # All transactions with filters
│   │   │   │   ├── @list/               # Parallel: Transaction list
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── @chart/              # Parallel: Spending chart
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx         # Add transaction
│   │   │   │   ├── upload/
│   │   │   │   │   └── page.tsx         # Upload bank statement
│   │   │   │   └── [transactionId]/
│   │   │   │       ├── page.tsx         # Transaction details
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx
│   │   │   │
│   │   │   ├── categories/              # Category Management
│   │   │   │   ├── page.tsx             # Category overview
│   │   │   │   ├── [categoryId]/
│   │   │   │   │   └── page.tsx         # Category drill-down
│   │   │   │   └── manage/
│   │   │   │       └── page.tsx         # Manage categories
│   │   │   │
│   │   │   ├── analytics/               # Expense Analytics
│   │   │   │   ├── page.tsx             # Analytics dashboard
│   │   │   │   ├── @trends/             # Parallel: Trends chart
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── @breakdown/          # Parallel: Category breakdown
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── @insights/           # Parallel: AI insights
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   └── reports/
│   │   │   │       └── page.tsx         # Downloadable reports
│   │   │   │
│   │   │   ├── budgets/                 # Budget Management
│   │   │   │   ├── page.tsx             # Budget dashboard
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx         # Create budget
│   │   │   │   └── [budgetId]/
│   │   │   │       └── page.tsx         # Budget details
│   │   │   │
│   │   │   ├── splits/                  # Expense Splitting
│   │   │   │   ├── page.tsx             # Active splits
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx         # Create split
│   │   │   │   └── [splitId]/
│   │   │   │       ├── page.tsx         # Split details
│   │   │   │       └── settle/
│   │   │   │           └── page.tsx     # Settle split
│   │   │   │
│   │   │   ├── events/                  # Event/Trip Expense Management
│   │   │   │   ├── page.tsx             # Events list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx         # Create event
│   │   │   │   └── [eventId]/
│   │   │   │       ├── page.tsx         # Event details
│   │   │   │       ├── expenses/
│   │   │   │       │   └── page.tsx     # Event expenses
│   │   │   │       └── split/
│   │   │   │           └── page.tsx     # Split event costs
│   │   │   │
│   │   │   ├── insights/                # AI Insights & Suggestions
│   │   │   │   └── page.tsx             # AI-powered insights
│   │   │   │
│   │   │   └── @modal/                  # Intercepted routes
│   │   │       ├── (.)transactions/
│   │   │       │   └── new/
│   │   │       │       └── page.tsx     # Add transaction modal
│   │   │       └── default.tsx
│   │   │
│   │   ├── trading/                     # Algorithmic Trading Module
│   │   │   ├── layout.tsx               # Trading cockpit layout
│   │   │   ├── page.tsx                 # Trading overview
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   │
│   │   │   ├── dashboard/               # Trading Dashboard
│   │   │   │   ├── page.tsx             # Live trading dashboard
│   │   │   │   ├── @greeks/             # Parallel: Greeks visualization
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── loading.tsx
│   │   │   │   ├── @positions/          # Parallel: Active positions
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── loading.tsx
│   │   │   │   ├── @pnl/                # Parallel: P&L chart
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── @signals/            # Parallel: AI signals
│   │   │   │   │   └── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   │
│   │   │   ├── config/                  # Trading Configuration
│   │   │   │   ├── page.tsx             # Config hub
│   │   │   │   ├── balance-limits/
│   │   │   │   │   └── page.tsx         # Balance & risk limits
│   │   │   │   ├── strategies/
│   │   │   │   │   ├── page.tsx         # Strategy management
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx     # Create strategy
│   │   │   │   │   ├── canvas/
│   │   │   │   │   │   └── page.tsx     # No-code strategy builder
│   │   │   │   │   └── [strategyId]/
│   │   │   │   │       ├── page.tsx     # Strategy details
│   │   │   │   │       └── edit/
│   │   │   │   │           └── page.tsx
│   │   │   │   ├── instruments/
│   │   │   │   │   └── page.tsx         # Instrument selection
│   │   │   │   └── advanced/
│   │   │   │   │   └── page.tsx         # Advanced settings
│   │   │   │
│   │   │   ├── positions/               # Position Management
│   │   │   │   ├── page.tsx             # All positions
│   │   │   │   ├── @active/             # Parallel: Active positions
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── @closed/             # Parallel: Closed positions
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   └── [positionId]/
│   │   │   │       └── page.tsx         # Position details
│   │   │   │
│   │   │   ├── orders/                  # Order Management
│   │   │   │   ├── page.tsx             # Order history
│   │   │   │   └── [orderId]/
│   │   │   │       └── page.tsx         # Order details
│   │   │   │
│   │   │   ├── analytics/               # Trading Analytics
│   │   │   │   ├── page.tsx             # Analytics dashboard
│   │   │   │   ├── @performance/        # Parallel: Performance metrics
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── @latency/            # Parallel: Latency monitoring
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── @slippage/           # Parallel: Slippage analysis
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   └── reports/
│   │   │   │       └── page.tsx         # Downloadable reports
│   │   │   │
│   │   │   ├── market-insights/         # Market Analysis
│   │   │   │   ├── page.tsx             # Market overview
│   │   │   │   ├── volatility/
│   │   │   │   │   └── page.tsx         # IV surface, GEX
│   │   │   │   ├── options-chain/
│   │   │   │   │   └── page.tsx         # Live options chain
│   │   │   │   └── max-pain/
│   │   │   │       └── page.tsx         # Max pain analysis
│   │   │   │
│   │   │   ├── ai-models/               # AI Model Monitoring
│   │   │   │   ├── page.tsx             # Model performance
│   │   │   │   └── [modelId]/
│   │   │   │       └── page.tsx         # Model details
│   │   │   │
│   │   │   └── @modal/                  # Intercepted routes
│   │   │       ├── (.)config/
│   │   │       │   └── balance-limits/
│   │   │       │       └── page.tsx     # Quick edit modal
│   │   │       └── default.tsx
│   │   │
│   │   ├── workspaces/                  # Workspace Management
│   │   │   ├── page.tsx                 # Workspace switcher/overview
│   │   │   ├── new/
│   │   │   │   └── page.tsx             # Create workspace
│   │   │   ├── [workspaceId]/
│   │   │   │   ├── page.tsx             # Workspace dashboard
│   │   │   │   ├── settings/
│   │   │   │   │   ├── page.tsx         # Workspace settings
│   │   │   │   │   ├── general/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── members/
│   │   │   │   │   │   ├── page.tsx     # Manage members
│   │   │   │   │   │   └── invite/
│   │   │   │   │   │       └── page.tsx
│   │   │   │   │   ├── teams/
│   │   │   │   │   │   ├── page.tsx     # Manage teams
│   │   │   │   │   │   ├── new/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   └── [teamId]/
│   │   │   │   │   │       └── page.tsx
│   │   │   │   │   ├── permissions/
│   │   │   │   │   │   └── page.tsx     # Role permissions
│   │   │   │   │   └── danger/
│   │   │   │   │       └── page.tsx     # Delete workspace
│   │   │   │   ├── aggregate/           # Workspace Aggregation
│   │   │   │   │   └── page.tsx         # Aggregated view (family net worth)
│   │   │   │   └── analytics/
│   │   │   │       └── page.tsx         # Workspace analytics
│   │   │   └── accept-invite/
│   │   │       └── [inviteId]/
│   │   │           └── page.tsx         # Accept workspace invite
│   │   │
│   │   ├── account/                     # User Account Management
│   │   │   ├── page.tsx                 # Account overview
│   │   │   ├── profile/
│   │   │   │   └── page.tsx             # Edit profile
│   │   │   ├── security/
│   │   │   │   ├── page.tsx             # Security settings
│   │   │   │   ├── password/
│   │   │   │   │   └── page.tsx         # Change password
│   │   │   │   ├── 2fa/
│   │   │   │   │   └── page.tsx         # 2FA management
│   │   │   │   ├── passkeys/
│   │   │   │   │   └── page.tsx         # Manage passkeys
│   │   │   │   └── sessions/
│   │   │   │       └── page.tsx         # Active sessions
│   │   │   ├── linked-accounts/
│   │   │   │   ├── page.tsx             # Linked accounts (banks, brokers)
│   │   │   │   └── connect/
│   │   │   │       └── [provider]/
│   │   │   │           └── page.tsx     # Connect account
│   │   │   ├── api-credentials/
│   │   │   │   ├── page.tsx             # API tokens
│   │   │   │   └── new/
│   │   │   │       └── page.tsx         # Create API token
│   │   │   ├── preferences/
│   │   │   │   └── page.tsx             # App preferences
│   │   │   └── notifications/
│   │   │       └── page.tsx             # Notification settings
│   │   │
│   │   └── admin/                       # Admin Dashboard (Super Admin only)
│   │       ├── layout.tsx               # Admin layout with expanded nav
│   │       ├── page.tsx                 # Admin overview
│   │       ├── users/
│   │       │   ├── page.tsx             # User management
│   │       │   └── [userId]/
│   │       │       ├── page.tsx         # User details
│   │       │       └── audit-log/
│   │       │           └── page.tsx     # User audit log
│   │       ├── workspaces/
│   │       │   ├── page.tsx             # All workspaces
│   │       │   └── [workspaceId]/
│   │       │       └── page.tsx         # Workspace admin view
│   │       ├── ai-models/               # AI Model Monitoring (Admin)
│   │       │   ├── page.tsx             # All models
│   │       │   ├── @training/           # Parallel: Training metrics
│   │       │   │   └── page.tsx
│   │       │   ├── @inference/          # Parallel: Inference stats
│   │       │   │   └── page.tsx
│   │       │   ├── @drift/              # Parallel: Model drift
│   │       │   │   └── page.tsx
│   │       │   ├── layout.tsx
│   │       │   └── [modelId]/
│   │       │       ├── page.tsx         # Model details
│   │       │       ├── activations/
│   │       │       │   └── page.tsx     # Layer activations (MRI)
│   │       │       └── explainability/
│   │       │           └── page.tsx     # SHAP values
│   │       ├── system/                  # System Monitoring
│   │       │   ├── page.tsx             # System overview
│   │       │   ├── @metrics/            # Parallel: System metrics
│   │       │   │   └── page.tsx
│   │       │   ├── @errors/             # Parallel: Error logs
│   │       │   │   └── page.tsx
│   │       │   ├── @performance/        # Parallel: Performance
│   │       │   │   └── page.tsx
│   │       │   ├── layout.tsx
│   │       │   ├── health/
│   │       │   │   └── page.tsx         # Service health checks
│   │       │   └── logs/
│   │       │       └── page.tsx         # System logs
│   │       ├── trading-engine/          # Algo Worker Monitoring
│   │       │   ├── page.tsx             # Engine overview
│   │       │   ├── latency/
│   │       │   │   └── page.tsx         # Latency monitoring
│   │       │   ├── circuit-breakers/
│   │       │   │   └── page.tsx         # Circuit breaker status
│   │       │   └── kill-switch/
│   │       │       └── page.tsx         # Emergency stop controls
│   │       ├── compliance/              # Compliance Dashboard
│   │       │   ├── page.tsx             # Compliance overview
│   │       │   ├── audit-trail/
│   │       │   │   └── page.tsx         # Full audit trail
│   │       │   └── reports/
│   │       │       └── page.tsx         # Regulatory reports
│   │       └── analytics/               # Platform Analytics
│   │           └── page.tsx             # Usage analytics
│   │
│   ├── api/                             # API routes (REST endpoints, webhooks)
│   │   ├── auth/
│   │   │   └── [...auth]/
│   │   │       └── route.ts             # Better Auth API routes
│   │   ├── trpc/
│   │   │   └── [trpc]/
│   │   │       └── route.ts             # tRPC handler
│   │   ├── webhooks/
│   │   │   ├── account-aggregator/
│   │   │   │   └── route.ts             # Account Aggregator webhook
│   │   │   └── upstox/
│   │   │       └── route.ts             # Upstox webhook
│   │   └── health/
│   │       └── route.ts                 # Health check endpoint
│   │
│   ├── layout.tsx                       # Root layout (providers, metadata)
│   ├── loading.tsx                      # Global loading state
│   ├── error.tsx                        # Global error boundary
│   ├── not-found.tsx                    # 404 page
│   └── global-error.tsx                 # Global error (wraps root layout)
│
├── components/                          # Shared React components
│   ├── ui/                              # Base UI components (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── modal.tsx
│   │   ├── dropdown.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── forms/                           # Form components
│   │   ├── transaction-form.tsx
│   │   ├── goal-form.tsx
│   │   ├── strategy-form.tsx
│   │   └── ...
│   ├── charts/                          # Chart components
│   │   ├── net-worth-chart.tsx
│   │   ├── expense-pie-chart.tsx
│   │   ├── volatility-surface.tsx       # 3D chart (Plotly)
│   │   ├── greeks-heatmap.tsx
│   │   └── ...
│   ├── tables/                          # Data table components
│   │   ├── transactions-table.tsx
│   │   ├── positions-table.tsx
│   │   └── ...
│   ├── widgets/                         # Dashboard widgets
│   │   ├── net-worth-widget.tsx
│   │   ├── recent-activity-widget.tsx
│   │   ├── alerts-widget.tsx
│   │   └── ...
│   ├── auth/                            # Auth-specific components
│   │   ├── login-form.tsx
│   │   ├── register-form.tsx
│   │   ├── otp-input.tsx
│   │   ├── passkey-button.tsx
│   │   └── ...
│   ├── workspace/                       # Workspace components
│   │   ├── workspace-switcher.tsx
│   │   ├── member-list.tsx
│   │   ├── team-card.tsx
│   │   └── ...
│   └── layout/                          # Layout components
│       ├── header.tsx
│       ├── sidebar.tsx
│       ├── breadcrumbs.tsx
│       └── ...
│
├── lib/                                 # Core utilities
│   ├── trpc/                            # tRPC client setup
│   │   ├── client.ts                    # tRPC client (browser)
│   │   ├── server.ts                    # tRPC server helpers
│   │   └── react.tsx                    # tRPC React provider
│   ├── auth/                            # Auth client setup
│   │   ├── client.ts                    # Better Auth client
│   │   └── session.ts                   # Session helpers
│   ├── utils.ts                         # General utilities
│   ├── cn.ts                            # Class name utility (clsx + tailwind-merge)
│   └── constants.ts                     # App constants
│
├── hooks/                               # Custom React hooks
│   ├── use-auth.ts                      # Auth hook (wraps Better Auth useSession)
│   ├── use-workspace.ts                 # Workspace context hook
│   ├── use-debounce.ts
│   ├── use-intersection-observer.ts
│   └── use-local-storage.ts
│
├── store/                               # Client state management (Zustand)
│   ├── ui-store.ts                      # UI state (sidebar open, theme)
│   ├── workspace-store.ts               # Workspace state (active workspace)
│   └── trading-store.ts                 # Trading state (filters, view mode)
│
├── styles/                              # Global styles
│   └── globals.css                      # Tailwind imports + global styles
│
├── public/                              # Static assets
│   ├── images/
│   ├── icons/
│   └── favicon.ico
│
├── types/                               # Type definitions
│   ├── auth.ts                          # Auth types (extends Better Auth)
│   ├── workspace.ts                     # Workspace types
│   └── index.ts                         # Re-exports
│
├── middleware.ts                        # Next.js middleware (auth, workspace)
├── next.config.mjs                      # Next.js configuration
├── tailwind.config.ts                   # Tailwind configuration
├── tsconfig.json                        # TypeScript configuration
├── .env.local                           # Environment variables
├── .env.example                         # Environment variables template
└── package.json
```

---

## 🔐 Authentication Architecture

### Better Auth Integration

```typescript
// lib/auth/client.ts
import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    organizationClient(), // Organization plugin
  ],
});

// Export all hooks
export const {
  useSession,
  signIn,
  signUp,
  signOut,
  useActiveOrganization,
  useListOrganizations,
  // ... all other Better Auth hooks
} = authClient;
```

### Session Management with Auto-Signout

```typescript
// hooks/use-auth.ts
"use client";

import { useSession as useBetterAuthSession } from "@/lib/auth/client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function useAuth() {
  const session = useBetterAuthSession();
  const router = useRouter();
  const lastActivityRef = useRef<number>(Date.now());

  // Auto-signout after 15 minutes of inactivity
  useEffect(() => {
    if (!session.data) return;

    const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const checkInactivity = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;

      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        // Sign out user
        signOut({
          fetchOptions: {
            onSuccess: () => {
              router.push("/login?reason=inactivity");
            },
          },
        });
      }
    }, 60000); // Check every minute

    // Track user activity
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, updateActivity);
    });

    return () => {
      clearInterval(checkInactivity);
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [session.data, router]);

  return session;
}
```

### Middleware for Protected Routes

```typescript
// middleware.ts
import { betterAuth } from "better-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const auth = betterAuth({
  // ... config
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const publicRoutes = ["/login", "/register", "/forgot-password"];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check session cookie
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check workspace context for dashboard routes
  if (pathname.startsWith("/(dashboard)")) {
    const activeOrg = await auth.api.getFullOrganization({
      headers: request.headers,
    });

    if (!activeOrg && !pathname.includes("/workspaces/new")) {
      return NextResponse.redirect(
        new URL("/onboarding/workspace-setup", request.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
```

---

## 🏢 Workspace Architecture

### Workspace Context Provider

```typescript
// app/(dashboard)/layout.tsx
import { WorkspaceProvider } from "@/components/workspace/workspace-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  );
}
```

### Workspace Hook

```typescript
// hooks/use-workspace.ts
"use client";

import { useActiveOrganization } from "@/lib/auth/client";
import { trpc } from "@/lib/trpc/client";

export function useWorkspace() {
  const { data: activeOrg, isPending } = useActiveOrganization();

  // Fetch workspace-specific data using tRPC
  const { data: workspace } = trpc.workspaces.get.useQuery(
    { id: activeOrg?.id || "" },
    { enabled: !!activeOrg?.id }
  );

  const switchWorkspace = async (workspaceId: string) => {
    // Better Auth handles this
    await setActiveOrganization({ organizationId: workspaceId });
  };

  return {
    workspace,
    activeOrg,
    isLoading: isPending,
    switchWorkspace,
    // Workspace type helper
    isFamily: workspace?.type === "FAMILY",
    isBusiness: workspace?.type === "BUSINESS",
    isSolo: workspace?.type === "SOLO",
  };
}
```

### Workspace Aggregation Logic

```typescript
// lib/workspace/aggregation.ts
export type WorkspaceType = "FAMILY" | "BUSINESS" | "FRIENDS" | "SOLO";

export interface AggregationStrategy {
  calculateNetWorth: (members: Member[]) => number;
  aggregateExpenses: (members: Member[]) => Expense[];
  aggregateInvestments: (members: Member[]) => Investment[];
}

const FAMILY_STRATEGY: AggregationStrategy = {
  calculateNetWorth: (members) => {
    // Sum all members' net worth
    return members.reduce((total, member) => total + member.netWorth, 0);
  },
  aggregateExpenses: (members) => {
    // Merge and deduplicate shared expenses
    const allExpenses = members.flatMap((m) => m.expenses);
    return deduplicateSharedExpenses(allExpenses);
  },
  aggregateInvestments: (members) => {
    // Show all investments with ownership info
    return members.flatMap((m) =>
      m.investments.map((inv) => ({
        ...inv,
        owner: m.name,
      }))
    );
  },
};

const BUSINESS_STRATEGY: AggregationStrategy = {
  calculateNetWorth: (members) => {
    // Separate calculation per team, then sum
    const teamTotals = groupByTeam(members).map((team) =>
      team.reduce((total, member) => total + member.netWorth, 0)
    );
    return teamTotals.reduce((a, b) => a + b, 0);
  },
  // ...
};

export function getAggregationStrategy(
  type: WorkspaceType
): AggregationStrategy {
  switch (type) {
    case "FAMILY":
      return FAMILY_STRATEGY;
    case "BUSINESS":
      return BUSINESS_STRATEGY;
    // ...
  }
}
```

---

## 📊 Data Fetching Patterns

### Server Components (Default)

```typescript
// app/(dashboard)/wealth/networth/page.tsx
import { api } from "@/lib/trpc/server";
import { NetWorthChart } from "@/components/charts/net-worth-chart";

export default async function NetWorthPage() {
  // Fetch data on the server
  const netWorth = await api.wealth.getNetWorth();
  const history = await api.wealth.getNetWorthHistory({ days: 365 });

  return (
    <div>
      <h1>Net Worth</h1>
      <NetWorthChart data={history} current={netWorth} />
    </div>
  );
}
```

### Client Components with tRPC

```typescript
// components/widgets/recent-activity-widget.tsx
"use client";

import { trpc } from "@/lib/trpc/client";

export function RecentActivityWidget() {
  const { data, isLoading, error } = trpc.transactions.getRecent.useQuery({
    limit: 10,
  });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorState error={error} />;

  return (
    <div>
      {data?.map((transaction) => (
        <TransactionRow key={transaction.id} {...transaction} />
      ))}
    </div>
  );
}
```

### Streaming with Suspense

```typescript
// app/(dashboard)/(home)/page.tsx
import { Suspense } from "react";
import { NetWorthWidget } from "@/components/widgets/net-worth-widget";
import { RecentActivityWidget } from "@/components/widgets/recent-activity-widget";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  return (
    <div className="grid grid-cols-3 gap-6">
      <Suspense fallback={<Skeleton className="h-64" />}>
        <NetWorthWidget />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-64" />}>
        <RecentActivityWidget />
      </Suspense>

      {/* More widgets... */}
    </div>
  );
}
```

### Optimistic Updates

```typescript
// components/forms/transaction-form.tsx
"use client";

import { trpc } from "@/lib/trpc/client";

export function TransactionForm() {
  const utils = trpc.useUtils();
  const addTransaction = trpc.transactions.create.useMutation({
    onMutate: async (newTransaction) => {
      // Cancel outgoing refetches
      await utils.transactions.getRecent.cancel();

      // Snapshot previous value
      const previousTransactions = utils.transactions.getRecent.getData();

      // Optimistically update
      utils.transactions.getRecent.setData({ limit: 10 }, (old) => [
        newTransaction,
        ...(old || []),
      ]);

      return { previousTransactions };
    },
    onError: (err, newTransaction, context) => {
      // Rollback on error
      utils.transactions.getRecent.setData(
        { limit: 10 },
        context?.previousTransactions
      );
    },
    onSettled: () => {
      // Refetch after mutation
      utils.transactions.getRecent.invalidate();
    },
  });

  // ...
}
```

---

## 🎨 Component Architecture

### Atomic Design Structure

```
components/
├── ui/              # Atoms (base components)
├── forms/           # Molecules (form components)
├── widgets/         # Organisms (dashboard widgets)
├── layout/          # Templates (layout components)
└── pages/           # Pages (full page compositions)
```

### Component Guidelines

1. **Server Components by default** - Only use `"use client"` when needed
2. **Composition over configuration** - Small, composable components
3. **Props interface first** - Define props interface before implementation
4. **Accessibility** - ARIA labels, keyboard navigation, focus management
5. **Performance** - React.memo for expensive components, useCallback for handlers

### Example: Compound Component Pattern

```typescript
// components/ui/card.tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      {children}
    </div>
  );
}

Card.Header = function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn("p-6 pb-0", className)}>
      {children}
    </div>
  );
};

Card.Title = function CardTitle({ children, className }: CardProps) {
  return (
    <h3 className={cn("text-2xl font-semibold", className)}>
      {children}
    </h3>
  );
};

Card.Content = function CardContent({ children, className }: CardProps) {
  return (
    <div className={cn("p-6", className)}>
      {children}
    </div>
  );
};

// Usage
<Card>
  <Card.Header>
    <Card.Title>Net Worth</Card.Title>
  </Card.Header>
  <Card.Content>
    <NetWorthChart />
  </Card.Content>
</Card>
```

---

## 🚦 Error Handling

### Error Boundaries

```typescript
// app/(dashboard)/error.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
        <p className="text-muted-foreground mb-6">
          {error.message || "An unexpected error occurred"}
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
```

### tRPC Error Handling

```typescript
// components/widgets/net-worth-widget.tsx
"use client";

import { trpc } from "@/lib/trpc/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function NetWorthWidget() {
  const { data, isLoading, error } = trpc.wealth.getNetWorth.useQuery();

  if (isLoading) return <Skeleton />;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error.message || "Failed to load net worth"}
        </AlertDescription>
      </Alert>
    );
  }

  return <div>{/* Render data */}</div>;
}
```

---

## 🔄 Loading States

### Skeleton Components

```typescript
// components/ui/skeleton.tsx
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
    />
  );
}

// Usage in loading.tsx
// app/(dashboard)/wealth/networth/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
```

### Streaming with Suspense Boundaries

```typescript
// app/(dashboard)/wealth/networth/page.tsx
import { Suspense } from "react";

export default function NetWorthPage() {
  return (
    <div className="space-y-6">
      <h1>Net Worth</h1>

      <div className="grid grid-cols-2 gap-6">
        <Suspense fallback={<Skeleton className="h-64" />}>
          <NetWorthChartAsync />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-64" />}>
          <AssetBreakdownAsync />
        </Suspense>
      </div>
    </div>
  );
}
```

---

## 🎯 Intercepted Routes & Modals

### Modal Pattern

```typescript
// app/(dashboard)/wealth/@modal/(.)networth/snapshot/[date]/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc/client";

export default function SnapshotModal({ params }: { params: { date: string } }) {
  const router = useRouter();
  const { data } = trpc.wealth.getSnapshot.useQuery({ date: params.date });

  return (
    <Modal onClose={() => router.back()}>
      <Modal.Header>
        <Modal.Title>Snapshot - {params.date}</Modal.Title>
      </Modal.Header>
      <Modal.Content>
        {/* Snapshot details */}
      </Modal.Content>
    </Modal>
  );
}
```

---

## 📱 Responsive Design

### Mobile-First Approach

```typescript
// components/layout/sidebar.tsx
"use client";

import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile: Sheet/Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop: Fixed Sidebar */}
      <aside className="hidden lg:block w-64 border-r">
        <SidebarContent />
      </aside>
    </>
  );
}
```

---

## 🎨 Theming & Dark Mode

```typescript
// app/layout.tsx
import { ThemeProvider } from "@/components/theme-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

## 🧪 Testing Strategy

### Component Testing

```typescript
// __tests__/components/net-worth-widget.test.tsx
import { render, screen } from "@testing-library/react";
import { NetWorthWidget } from "@/components/widgets/net-worth-widget";

describe("NetWorthWidget", () => {
  it("displays net worth correctly", () => {
    render(<NetWorthWidget />);
    expect(screen.getByText(/Net Worth/i)).toBeInTheDocument();
  });
});
```

---

## 📦 Build & Deployment

### Production Build

```bash
# Build all packages
pnpm build

# Build web only
pnpm --filter web build
```

### Environment Variables

```bash
# .env.example
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3004
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=mongodb://localhost:27017/trading
```

---

## 🎯 Performance Optimization

1. **Code Splitting**: Dynamic imports for heavy components
2. **Image Optimization**: Next.js Image component
3. **Font Optimization**: next/font
4. **Bundle Analysis**: @next/bundle-analyzer
5. **Cache Strategy**: Aggressive caching with revalidation
6. **Edge Runtime**: For critical routes
7. **Static Generation**: Where possible (landing pages)
8. **Incremental Static Regeneration**: For semi-static content

---

## 📚 Documentation

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Better Auth Documentation](https://better-auth.com)
- [tRPC Documentation](https://trpc.io)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)

---

**Status**: Production-Ready Architecture
**Last Updated**: December 25, 2025