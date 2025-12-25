# Web Dashboard Architecture - Quantum Investments and Trades (UFOS)

> **Design Philosophy**: A next-generation financial platform bridging high-frequency algorithmic trading and holistic wealth management with forensic AI observability.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Module Architecture](#module-architecture)
3. [Technical Patterns](#technical-patterns)
4. [Data Flow](#data-flow)
5. [Component Hierarchy](#component-hierarchy)
6. [Access Control](#access-control)
7. [Performance Optimization](#performance-optimization)

---

## System Overview

### The UFOS Vision

The Unified Financial Operating System (UFOS) eliminates the bifurcation in financial technology:

- **For Investors**: A "Financial Sanctum" aggregating PF, NPS, Insurance, Crypto, and Equities into a unified Net Worth view
- **For Traders**: A "Combat Cockpit" enabling micromanagement of Nifty Options algorithmic strategies with real-time Greeks analytics
- **For Admins**: "God Mode" providing forensic visibility into AI model decision-making with kill switches and compliance monitoring

### Key Architectural Principles

1. **Multi-Dashboard Modularity**: Each dashboard (Wealth, Trade, Account, Organization, Admin) is a self-contained module
2. **Organization-First Design**: All data access is scoped to organizations and teams with RBAC
3. **Data Access Layer (DAL)**: Centralized, secure data fetching with automatic session verification and permission checks
4. **Real-Time by Default**: WebSocket subscriptions for live data, optimistic updates for actions
5. **Type-Safe Everything**: tRPC for APIs, Zod for validation, TypeScript discriminated unions
6. **Observability-Driven**: Every action logged, every model prediction explainable

---

## Module Architecture

### Module 1: Wealth Management Dashboard ("Financial Sanctum")

**Purpose**: Unified view of all assets with net worth tracking and legacy planning

#### Core Components

##### 1.1 Net Worth Waterfall

```typescript
// components/wealth/NetWorthWaterfall.tsx
interface NetWorthData {
  totalAssets: number;
  liquidAssets: {
    cash: number;
    stocks: number;
    crypto: number;
    mutualFunds: number;
  };
  lockedAssets: {
    epf: number;
    nps: number;
    realEstate: number;
    fixedDeposits: number;
  };
  totalLiabilities: number;
  liabilities: {
    mortgages: number;
    creditCards: number;
    loans: number;
  };
}

// Visualization: Split-bar with liquid vs. locked distinction
// Data Source: tRPC router `wealth.getNetWorth()`
```

##### 1.2 Asset Allocation Sunburst

```typescript
// components/wealth/AssetAllocationSunburst.tsx
interface AssetHierarchy {
  level1: "Equity" | "Debt" | "Real Assets" | "Crypto";
  level2: string; // e.g., 'Domestic', 'International' for Equity
  level3: string; // e.g., 'HDFC Bank', 'NIFTY 50 Index Fund'
  value: number;
  allocation: number; // percentage
}

// Interaction: Click segment -> filter dashboard context
// Uses D3.js partition layout with zoom transitions
```

##### 1.3 Specialized Asset Cards

**Provident Fund (EPF) Card**

```typescript
interface EPFAsset {
  uan: string;
  balance: number;
  monthlyContribution: number;
  interestRate: number; // 8.15%
  projectedCorpus: number; // at retirement
  contributionHistory: Array<{
    month: string;
    employeeContribution: number;
    employerContribution: number;
  }>;
}

// Visualizations:
// - Compounding projection line chart
// - Contribution heatmap (consistency tracking)
// Data Source: UAN integration via EPFO API
```

**National Pension System (NPS) Card**

```typescript
interface NPSAsset {
  pran: string;
  tier1Balance: number; // locked
  tier2Balance: number; // liquid
  fundManager: string;
  schemePerformance: {
    scheme: string;
    returns: number;
    benchmark: number;
  }[];
  annuityProjection: number; // monthly pension estimate
}

// Visualizations:
// - Scheme performance vs. benchmark
// - Annuity simulator with corpus growth curve
// Data Source: CRA API / CAS import
```

**Insurance Card**

```typescript
interface InsurancePolicy {
  policyNumber: string;
  type: "Life" | "Health" | "Term";
  premium: number;
  frequency: "Monthly" | "Quarterly" | "Yearly";
  coverage: number;
  maturityDate: Date;
  renewalDate: Date;
  nominees: Array<{ name: string; relation: string; share: number }>;
}

// Visualizations:
// - Coverage radar chart (actual vs. recommended HLV)
// - Premium calendar timeline
// Data Source: OCR parsing of policy documents
```

**Cryptocurrency & DeFi Card**

```typescript
interface CryptoAsset {
  walletAddress: string;
  chain: "Ethereum" | "Solana" | "Polygon";
  tokens: Array<{
    contractAddress: string;
    symbol: string;
    balance: number;
    valueUSD: number;
    isSpam: boolean; // filter dusting attacks
  }>;
  defiPositions: Array<{
    protocol: string;
    type: "Liquidity Pool" | "Staking" | "Lending";
    deposited: number;
    currentValue: number;
    impermanentLoss: number | null;
    apy: number;
  }>;
}

// Visualizations:
// - Chain allocation pie chart
// - Impermanent loss calculator for LP positions
// Data Source: On-chain sync via xPub/wallet address
```

##### 1.4 Life Beat & Legacy Planning

```typescript
interface LegacyProtocol {
  heartbeatInterval: number; // days (default: 30)
  lastLogin: Date;
  nextCheckIn: Date;
  status: "ACTIVE" | "AMBER" | "RED" | "TRIGGERED";
  beneficiaries: Array<{
    name: string;
    email: string;
    phone: string;
    encryptedMessage: string; // not credentials, just guidance
  }>;
  legacyPacket: {
    assetLocations: string[]; // banks, brokers, wallets
    insurancePolicies: string[];
    advisorContacts: string[];
    instructions: string;
  };
}

// UI Pattern: Pulse indicator in settings
// Automation: Cron job checking lastLogin, sending reminders
// Trigger: Auto-release legacy packet if no response
```

##### 1.5 Time-Machine Analytics

```typescript
// Sankey Diagram for Capital Flow
interface CapitalFlow {
  fromDate: Date;
  toDate: Date;
  flows: Array<{
    source: string; // 'Nifty Options'
    target: string; // 'Debt Mutual Fund'
    amount: number;
    reason?: string; // user-provided annotation
  }>;
}

// Performance Attribution
interface PerformanceMetrics {
  twrr: number; // Time-Weighted Return (investment performance)
  mwrr: number; // Money-Weighted Return (cash flow timing)
  absoluteReturn: number;
  xirr: number; // Extended IRR for irregular cash flows
}

// Data Source: tRPC router `wealth.getCapitalFlow()`, `wealth.getPerformance()`
```

---

### Module 2: Algorithmic Trading Cockpit ("Combat Cockpit")

**Purpose**: High-density, low-latency interface for Nifty Options algorithmic trading

#### Core Components

##### 2.1 Greeks Command Center

**Volatility Surface (3D)**

```typescript
interface VolatilitySurface {
  data: Array<{
    strike: number;
    daysToExpiry: number;
    impliedVolatility: number;
  }>;
  spotPrice: number;
  updateTime: Date;
}

// Visualization: Plotly.js 3D mesh plot
// Interaction: Rotate, zoom, identify volatility skew/smile
// Insight: Spot overpriced/underpriced strikes for calendar spreads
// Data Source: tRPC subscription `trade.options.volatilitySurface`
```

**Max Pain & Open Interest Buildup**

```typescript
interface OpenInterestData {
  strikes: number[];
  callOI: number[];
  putOI: number[];
  callOIChange: number[];
  putOIChange: number[];
  maxPain: number; // strike with max writer pain
  pcrByOI: number; // Put-Call Ratio by Open Interest
}

// Visualization: Combined bar chart (OI buildup) + line (max pain marker)
// Insight: Market likely to be "pinned" at max pain on expiry
// Data Source: tRPC subscription `trade.options.openInterest`
```

**Gamma Exposure (GEX) Dashboard**

```typescript
interface GammaExposure {
  strikes: number[];
  gex: number[]; // positive = dealers long gamma, negative = short gamma
  spotPrice: number;
  flipZone: number; // price level where net gamma = 0
  zeroGammaBand: [number, number]; // range of equilibrium
}

// Visualization: Vertical histogram aligned with option chain
// Color Coding:
// - Green bars: Dealer long gamma (dampens volatility)
// - Red bars: Dealer short gamma (accelerates volatility)
// - Orange line: Flip zone (turbulence threshold)
// Insight: Predict volatility regime changes
// Data Source: tRPC subscription `trade.options.gammaExposure`
```

**Vanna & Charm Heatmaps (Second-Order Greeks)**

```typescript
interface VannaData {
  strikes: number[];
  expiries: Date[];
  vannaMatrix: number[][]; // dDelta/dIV
  spotPrice: number;
  currentIV: number;
}

interface CharmData {
  strikes: number[];
  timeToExpiry: number[];
  charmMatrix: number[][]; // dDelta/dTime
  spotPrice: number;
}

// Vanna Heatmap: Strike x Time colored by Vanna intensity
// Use Case: Event trading (e.g., Budget Day IV crush hedging)

// Charm Decay Curve: Line chart forecasting Delta drift from time decay
// Use Case: Pre-hedge against time decay instead of reacting
// Data Source: tRPC routers `trade.options.vanna`, `trade.options.charm`
```

##### 2.2 Strategy Configuration & Micromanagement

**Live Tuner Panel**

```typescript
interface StrategyParameters {
  strategyId: string;
  status: "RUNNING" | "PAUSED" | "STOPPED";
  parameters: {
    stopLossPercent: number; // adjustable slider
    trailingTickSize: number;
    rsiPeriod: number;
    maxOrderQuantity: number;
    signalSensitivity: number; // 0-100 scale
  };
  lastUpdated: Date;
  updateMode: "MANUAL" | "SCHEDULED" | "ADAPTIVE";
}

// Backend: WebSocket control channel to algo-worker
// Mechanism: Updates Redis key-value store, algo reads on next tick
// Constraint: No strategy restart required (hot reload)
// UI: Sidebar with sliders, number inputs, toggle switches
// Data Source: tRPC mutation `trade.strategies.updateParameters()`
```

**Node-Based Strategy Canvas (No-Code)**

```typescript
interface StrategyNode {
  id: string;
  type: "TRIGGER" | "ACTION" | "RISK" | "CONTEXT";
  config: Record<string, any>;
  position: { x: number; y: number };
}

interface StrategyEdge {
  source: string;
  target: string;
  condition?: string; // 'AND' | 'OR' | 'NOT'
}

// Example Flow:
// [TRIGGER: Nifty > VWAP] -> [CONTEXT: GEX Flip Reached] ->
// [ACTION: Buy ATM Call] -> [RISK: Stop Loss = 20%]

// Visualization: Cytoscape.js drag-and-drop canvas
// Backend: Serialize to JSON, send to algo-worker for execution
// Data Source: tRPC mutation `trade.strategies.create()`
```

##### 2.3 Execution Quality Monitoring

**Slippage Scatter Plot**

```typescript
interface SlippageData {
  trades: Array<{
    timestamp: Date;
    symbol: string;
    expectedPrice: number;
    filledPrice: number;
    slippage: number; // bps
    orderType: "MARKET" | "LIMIT";
    timeOfDay: string; // HH:MM
  }>;
}

// Visualization: Scatter plot (X=Time of Day, Y=Slippage)
// Insight: Identify high-slippage windows (e.g., market open, 2:30 PM)
// Action: Adjust execution algorithm or avoid those times
// Data Source: tRPC query `trade.execution.getSlippage()`
```

**Tick-to-Trade Latency Heatmap**

```typescript
interface LatencyMetrics {
  data: Array<{
    timestamp: Date;
    signalGeneration: number; // ms
    brokerAPI: number; // ms
    exchangeAck: number; // ms
    total: number; // ms
  }>;
  p50: number;
  p95: number;
  p99: number;
}

// Visualization: Heatmap grid with color coding
// - Green: <5ms (excellent)
// - Yellow: 10-50ms (acceptable)
// - Red: >50ms (upgrade needed)
// Insight: Justify co-location or infrastructure upgrades
// Data Source: tRPC query `trade.execution.getLatency()`
```

---

### Module 3: Account Dashboard

**Purpose**: User profile, linked accounts, security, and preferences

#### Core Components

##### 3.1 Profile & KYC

```typescript
interface UserProfile {
  userId: string;
  email: string;
  name: string;
  phone: string;
  kycStatus: "PENDING" | "VERIFIED" | "REJECTED";
  kycDocuments: Array<{
    type: "PAN" | "Aadhaar" | "Passport" | "Driving License";
    documentId: string;
    verifiedAt: Date | null;
  }>;
  investorCategory: "RETAIL" | "HNI" | "INSTITUTIONAL";
}

// Data Source: tRPC query `account.getProfile()`
// Actions: tRPC mutations `account.updateProfile()`, `account.uploadKYC()`
```

##### 3.2 Linked Accounts

```typescript
interface LinkedAccount {
  accountId: string;
  type: "BROKER" | "BANK" | "CRYPTO_EXCHANGE";
  provider: string; // 'Upstox', 'HDFC', 'Binance'
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  credentials: {
    apiKey?: string;
    apiSecret?: string; // encrypted
    accessToken?: string;
  };
  lastSync: Date;
  permissions: string[]; // 'READ_PORTFOLIO', 'PLACE_ORDERS'
}

// Data Source: tRPC query `account.getLinkedAccounts()`
// Actions: tRPC mutations `account.linkAccount()`, `account.unlinkAccount()`
```

##### 3.3 Security Center

```typescript
interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod: "TOTP" | "SMS" | "EMAIL";
  passkeyEnabled: boolean;
  activeSessions: Array<{
    sessionId: string;
    device: string;
    ipAddress: string;
    location: string;
    lastActive: Date;
  }>;
  apiTokens: Array<{
    tokenId: string;
    name: string;
    scopes: string[];
    expiresAt: Date;
    lastUsed: Date;
  }>;
}

// Data Source: Better Auth client `authClient.twoFactor`, `authClient.passkey`
// Actions: Enable/disable 2FA, revoke sessions, regenerate API tokens
```

##### 3.4 Notification Preferences

```typescript
interface NotificationPreferences {
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
  alerts: {
    tradeExecutions: boolean;
    riskLimitBreaches: boolean;
    portfolioThresholds: {
      enabled: boolean;
      dailyPnLThreshold: number; // ₹
      portfolioValueChange: number; // %
    };
    systemStatus: boolean;
    modelDriftAlerts: boolean;
  };
}

// Data Source: tRPC query `account.getNotificationPreferences()`
// Actions: tRPC mutation `account.updateNotificationPreferences()`
```

---

### Module 4: Organization Management Dashboard

**Purpose**: Multi-tenancy with teams, roles, and shared strategy access

#### Core Components

##### 4.1 Organization Structure

```typescript
interface Organization {
  organizationId: string;
  name: string;
  slug: string; // URL-safe identifier
  logo: string | null;
  createdAt: Date;
  members: OrganizationMember[];
  teams: Team[];
  billingPlan: "FREE" | "PRO" | "ENTERPRISE";
  settings: {
    defaultCurrency: string;
    timezone: string;
    riskLimits: GlobalRiskLimits;
  };
}

interface OrganizationMember {
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  joinedAt: Date;
  invitedBy: string | null;
}

interface Team {
  teamId: string;
  name: string;
  description: string;
  members: TeamMember[];
  dashboardAccess: DashboardPermissions;
  sharedStrategies: string[]; // strategyIds
}

interface TeamMember {
  userId: string;
  role: "MANAGER" | "TRADER" | "VIEWER";
  addedAt: Date;
}

// Data Source: Better Auth organization plugin + tRPC extensions
// Actions:
// - `organization.create()`
// - `organization.inviteMember()`
// - `organization.createTeam()`
// - `organization.updateTeamAccess()`
```

##### 4.2 Role-Based Access Control (RBAC)

```typescript
interface DashboardPermissions {
  wealth: {
    view: boolean;
    edit: boolean;
    export: boolean;
  };
  trade: {
    viewStrategies: boolean;
    createStrategies: boolean;
    executeStrategies: boolean;
    modifyRiskLimits: boolean;
  };
  account: {
    viewProfile: boolean;
    editProfile: boolean;
    manageLinkedAccounts: boolean;
  };
  organization: {
    viewMembers: boolean;
    inviteMembers: boolean;
    manageTeams: boolean;
    viewBilling: boolean;
  };
  admin: {
    viewAIModels: boolean;
    modifyKillSwitches: boolean;
    viewAuditTrail: boolean;
  };
}

// Permission Resolution:
// 1. Organization-level role (OWNER > ADMIN > MEMBER)
// 2. Team-level role (MANAGER > TRADER > VIEWER)
// 3. Explicit dashboard permissions
// Middleware: Check permissions before rendering routes
```

##### 4.3 Member Invitation Flow

```typescript
interface InvitationFlow {
  step1: {
    action: "organization.inviteMember()";
    payload: { email: string; role: "ADMIN" | "MEMBER" };
  };
  step2: {
    action: "Send invitation email with magic link";
    backend: "Better Auth invitation plugin";
  };
  step3: {
    action: "User clicks link, creates account (if new)";
    backend: "Better Auth registration + organization join";
  };
  step4: {
    action: "User appears in organization members list";
    ui: "Real-time update via tRPC subscription";
  };
}

// Data Source: Better Auth + tRPC mutation `organization.inviteMember()`
```

---

### Module 5: Admin "God Mode" Dashboard

**Purpose**: Forensic AI observability, kill switches, and compliance monitoring

#### Core Components

##### 5.1 AI Model Training Telemetry

**Loss Curves Dashboard**

```typescript
interface TrainingRun {
  runId: string;
  modelType: "XGBoost" | "CNN-LSTM" | "GINN" | "SVM" | "Transformer";
  startTime: Date;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  epochs: Array<{
    epoch: number;
    trainingLoss: number;
    validationLoss: number;
    duration: number; // seconds
    metrics: {
      accuracy: number;
      auc: number;
      sharpe: number;
    };
  }>;
  hyperparameters: Record<string, any>;
  datasetVersion: string;
}

// Visualization: Dual-line chart (training vs. validation loss)
// Alert: Highlight divergence (overfitting risk) in red
// Data Source: tRPC query `admin.aiModels.getTrainingRun()`
```

**Layer-Wise Activation Heatmaps**

```typescript
interface LayerActivations {
  modelId: string;
  layers: Array<{
    name: string;
    type: "LSTM" | "Dense" | "Conv2D" | "Attention";
    activations: number[][]; // neuron x sample
    statistics: {
      mean: number;
      std: number;
      deadNeurons: number; // count of zero-activation neurons
      saturatedNeurons: number; // count of max-activation neurons
    };
  }>;
}

// Visualization: Heatmap grid per layer
// Insight: Dead neurons (all zeros) = vanishing gradient problem
// Insight: Saturated neurons (all max) = exploding gradient problem
// Data Source: tRPC query `admin.aiModels.getLayerActivations()`
```

**Gradient Norm Monitor**

```typescript
interface GradientMetrics {
  runId: string;
  gradients: Array<{
    step: number;
    gradientNorm: number;
    layerGradients: Record<string, number>;
  }>;
  thresholds: {
    vanishingGradient: number; // e.g., <0.001
    explodingGradient: number; // e.g., >10
  };
}

// Visualization: Line chart with threshold bands
// Alert: Spike detection for exploding gradients
// Data Source: tRPC query `admin.aiModels.getGradientMetrics()`
```

##### 5.2 Inference Health & Model Drift

**Drift Speedometer**

```typescript
interface ModelDrift {
  modelId: string;
  trainingDistribution: Distribution;
  liveDistribution: Distribution;
  klDivergence: number; // Kullback-Leibler divergence
  status: "GREEN" | "YELLOW" | "RED";
  lastChecked: Date;
  recommendations: string[];
}

interface Distribution {
  features: Record<
    string,
    {
      mean: number;
      std: number;
      min: number;
      max: number;
      histogram: number[];
    }
  >;
}

// Visualization: Gauge chart with color zones
// Action: If RED, trigger `admin.aiModels.haltModel()` + retrain pipeline
// Data Source: tRPC query `admin.aiModels.getDrift()`
```

**Confidence vs. Reality Scatter Plot**

```typescript
interface PredictionAnalysis {
  predictions: Array<{
    predictionId: string;
    timestamp: Date;
    confidence: number; // 0-100%
    prediction: "VOL_UP" | "VOL_DOWN" | "NEUTRAL";
    actualOutcome: "VOL_UP" | "VOL_DOWN" | "NEUTRAL";
    pnl: number;
  }>;
  quadrants: {
    highConfidenceHighLoss: number; // danger zone
    highConfidenceHighProfit: number;
    lowConfidenceHighLoss: number;
    lowConfidenceHighProfit: number;
  };
}

// Visualization: Scatter plot (X=Confidence, Y=P&L)
// Danger Zone: High confidence + high loss = hallucinating model
// Action: Kill switch if danger zone count > threshold
// Data Source: tRPC query `admin.aiModels.getPredictionAnalysis()`
```

##### 5.3 Agentic Tracing

**Trace Waterfall View**

```typescript
interface TradeTrace {
  traceId: string;
  tradeOpportunityId: string;
  rootSpan: Span;
  totalDuration: number;
  decision: "EXECUTE" | "REJECT" | "WAIT";
}

interface Span {
  spanId: string;
  parentSpanId: string | null;
  name: string; // e.g., 'SentimentAgent', 'TechnicalAgent'
  startTime: Date;
  duration: number;
  attributes: Record<string, any>;
  children: Span[];
}

// Example Trace:
// Root: Trade_Opportunity_101 (decision: REJECT)
//   ├─ SentimentAgent (duration: 5ms)
//   │    └─ result: "News Sentiment is Bullish (Score: 0.8)"
//   ├─ TechnicalAgent (duration: 8ms)
//   │    └─ result: "RSI is 75 (Overbought). Recommendation: WAIT"
//   └─ RiskAgent (duration: 3ms)
//        └─ result: "Exposure Limit Reached. Action: REJECT TRADE"

// Visualization: Hierarchical timeline (similar to Jaeger)
// Interaction: Expand/collapse spans, view attributes
// Use Case: Debug "Why didn't the bot buy the dip?"
// Data Source: tRPC query `admin.agents.getTrace()`
```

##### 5.4 Explainable AI (SHAP Plots)

**SHAP Force Plot**

```typescript
interface SHAPExplanation {
  predictionId: string;
  basePrediction: number; // model baseline
  finalPrediction: number;
  features: Array<{
    name: string;
    value: number;
    shapValue: number; // contribution to prediction
    direction: "BUY" | "SELL";
  }>;
}

// Example:
// Base Prediction: 0.5 (neutral)
// Feature Contributions:
//   +0.3: RSI < 30 (oversold) -> BUY
//   +0.2: GEX > 0 (dealer long gamma) -> BUY
//   -0.4: VIX > 20 (high volatility) -> SELL
// Final Prediction: 0.6 (slight buy)

// Visualization: Horizontal bar chart with color coding
// Data Source: tRPC query `admin.aiModels.getSHAPExplanation()`
```

##### 5.5 Kill Switch Architecture

**Global Kill Switch**

```typescript
interface KillSwitch {
  type: "GLOBAL" | "PER_STRATEGY" | "PER_USER" | "PER_ASSET";
  status: "ARMED" | "TRIGGERED";
  triggeredBy: "MANUAL" | "AUTO_CIRCUIT_BREAKER";
  triggeredAt: Date | null;
  actions: {
    cancelOpenOrders: boolean;
    closeAllPositions: boolean;
    revokeAPITokens: boolean;
    disableNonAdminLogins: boolean;
  };
}

// UI Pattern: Prominent header bar with hazard striping
// Interaction: "Slide to Abort" (prevent accidental clicks)
// Backend Action: WebSocket broadcast to algo-worker
// Data Source: tRPC mutation `admin.risk.triggerKillSwitch()`
```

**Automated Circuit Breakers**

```typescript
interface CircuitBreaker {
  name: string;
  enabled: boolean;
  condition: string; // e.g., "Portfolio DD > 10%"
  threshold: number;
  currentValue: number;
  action: "HALT_ENTRIES" | "FLATTEN_POSITIONS" | "KILL_STRATEGY";
  cooldownPeriod: number; // hours
  lastTriggered: Date | null;
}

// Example Circuit Breakers:
// 1. Max Drawdown: If portfolio drops >10% intraday -> flatten + sleep 24h
// 2. Consecutive Losses: If 5 losses in a row -> pause strategy + alert admin
// 3. Liquidity Gap: If bid-ask spread > 50 pts -> halt entries
// 4. Fat Finger: Reject orders > ₹10 Crores immediately

// Data Source: tRPC query `admin.risk.getCircuitBreakers()`
// Actions: tRPC mutation `admin.risk.configureCircuitBreaker()`
```

##### 5.6 Compliance Dashboard

**Audit Trail Viewer**

```typescript
interface AuditLogEntry {
  logId: string;
  timestamp: Date;
  userId: string;
  action: string; // e.g., 'MODEL_X_BUY_SIGNAL_GENERATED'
  entity: string; // 'TradingSignal' | 'Order' | 'Position'
  entityId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}

// Visualization: Searchable, filterable table with timeline
// Immutable: Blockchain-style append-only log
// Use Case: Regulatory audits, debugging, forensics
// Data Source: tRPC query `admin.compliance.getAuditTrail()`
```

**Regulatory Limits Heatmap**

```typescript
interface RegulatoryLimits {
  limits: Array<{
    name: string; // e.g., 'SEBI Open Interest Limit'
    threshold: number;
    currentValue: number;
    utilizationPercent: number;
    status: "GREEN" | "YELLOW" | "RED";
    affectedStrategies: string[];
  }>;
}

// Visualization: Heatmap grid with color coding
// Alert: Turn orange/red as strategies approach limits
// Data Source: tRPC query `admin.compliance.getLimits()`
```

---

## Technical Patterns

### Data Fetching Patterns

#### Server Components (RSC)

```typescript
// app/(dashboards)/wealth/overview/page.tsx
import { trpc } from '@/lib/trpc-server';
import { getServerSession } from '@/hooks/auth';

export default async function WealthOverviewPage() {
  const session = await getServerSession();
  const netWorth = await trpc.wealth.getNetWorth.query({
    organizationId: session.user.activeOrganizationId,
  });

  return <NetWorthWaterfall data={netWorth} />;
}
```

#### Client Components with tRPC

```typescript
// components/trade/VolatilitySurface.tsx
'use client';

import { trpc } from '@/lib/trpc';

export function VolatilitySurface() {
  const { data, isLoading } = trpc.trade.options.volatilitySurface.useQuery(
    { symbol: 'NIFTY', expiry: 'WEEKLY' },
    { refetchInterval: 5000 } // poll every 5 seconds
  );

  if (isLoading) return <Skeleton3D />;
  return <Plotly3DSurface data={data} />;
}
```

#### Real-Time Subscriptions

```typescript
// components/trade/LiveGEXDashboard.tsx
'use client';

import { trpc } from '@/lib/trpc';

export function LiveGEXDashboard() {
  const { data } = trpc.trade.options.gammaExposure.useSubscription(
    { symbol: 'NIFTY' },
    {
      onData: (gex) => {
        // Real-time update via WebSocket
        console.log('GEX updated:', gex.flipZone);
      },
    }
  );

  return <GEXHistogram data={data} />;
}
```

### State Management Patterns

#### Zustand for Local UI State

```typescript
// stores/tradeStore.ts
import { create } from "zustand";

interface TradeState {
  selectedStrategy: string | null;
  liveTunerOpen: boolean;
  chartTimeframe: "1D" | "1W" | "1M";
  setSelectedStrategy: (id: string | null) => void;
  toggleLiveTuner: () => void;
  chartType: "CANDLESTICK" | "HEIKIN_ASHI" | "LINE";
  setChartType: (type: "CANDLESTICK" | "HEIKIN_ASHI" | "LINE") => void;
}

export const useTradeStore = create<TradeState>((set) => ({
  selectedStrategy: null,
  liveTunerOpen: false,
  chartTimeframe: "1D",
  chartType: "CANDLESTICK",
  setSelectedStrategy: (id) => set({ selectedStrategy: id }),
  toggleLiveTuner: () =>
    set((state) => ({ liveTunerOpen: !state.liveTunerOpen })),
  setChartType: (type) => set({ chartType: type }),
}));
```

#### React Query (via tRPC) for Server State

```typescript
// Automatic caching, deduplication, background refetching
const { data: portfolio } = trpc.wealth.getPortfolio.useQuery();

// Optimistic updates
const { mutate: updateStrategy } = trpc.trade.strategies.update.useMutation({
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await trpcUtils.trade.strategies.getAll.cancel();

    // Snapshot current data
    const previous = trpcUtils.trade.strategies.getAll.getData();

    // Optimistically update
    trpcUtils.trade.strategies.getAll.setData(undefined, (old) =>
      old?.map((s) => (s.id === newData.id ? { ...s, ...newData } : s))
    );

    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    trpcUtils.trade.strategies.getAll.setData(undefined, context?.previous);
  },
  onSettled: () => {
    // Refetch after mutation
    trpcUtils.trade.strategies.getAll.invalidate();
  },
});
```

### Access Control Patterns

#### Route Protection with Middleware

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "@/hooks/auth";

export async function middleware(request: NextRequest) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const hasAdminAccess =
      session.user.role === "ADMIN" || session.user.role === "OWNER";
    if (!hasAdminAccess) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/wealth/:path*",
    "/trade/:path*",
    "/admin/:path*",
    "/organization/:path*",
  ],
};
```

#### Organization Context Provider

```typescript
// providers/OrganizationProvider.tsx
'use client';

import { createContext, useContext, useState } from 'react';
import { useAuth } from '@/hooks/auth';

interface OrganizationContextValue {
  activeOrganizationId: string;
  switchOrganization: (id: string) => Promise<void>;
  userRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  permissions: DashboardPermissions;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [activeOrgId, setActiveOrgId] = useState(session.user.activeOrganizationId);

  const switchOrganization = async (id: string) => {
    await authClient.organization.setActive({ organizationId: id });
    setActiveOrgId(id);
    window.location.reload(); // Force data refetch
  };

  return (
    <OrganizationContext.Provider value={{
      activeOrganizationId: activeOrgId,
      switchOrganization,
      userRole: session.user.role,
      permissions: session.user.permissions,
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) throw new Error('useOrganization must be used within OrganizationProvider');
  return context;
};
```

---

## Data Flow

### End-to-End Data Flow Example: Live Strategy Parameter Update

```
1. User adjusts "Stop Loss %" slider in Live Tuner Panel
   ↓
2. React component calls tRPC mutation
   → trpc.trade.strategies.updateParameters.mutate({
       strategyId: 'xyz',
       stopLossPercent: 15
     })
   ↓
3. tRPC client sends HTTP POST to /api/trpc/trade.strategies.updateParameters
   ↓
4. API server (NestJS) validates request with Zod schema from @repo/schema
   ↓
5. API server updates MongoDB: user_trading_configs collection
   ↓
6. API server publishes event to Cloud Redis:
   XADD config:updates * strategyId xyz stopLossPercent 15
   ↓
7. Local algo-worker (subscribed to Cloud Redis) receives event
   ↓
8. Algo-worker updates in-memory strategy config (hot reload, no restart)
   ↓
9. Algo-worker sends WebSocket message back to API: "Config updated"
   ↓
10. API server pushes update to web via tRPC subscription
   ↓
11. Web UI updates optimistically, then refetches to confirm
   ↓
12. User sees "✓ Parameters updated (applied in 120ms)" toast notification
```

### Data Source Hierarchy

1. **tRPC Queries**: Primary data fetching mechanism
   - Wealth data: `wealth.*` routers
   - Trading data: `trade.*` routers
   - Account data: `account.*` routers
   - Organization data: `organization.*` routers
   - Admin data: `admin.*` routers

2. **Better Auth Client**: Authentication and organization management
   - Session: `authClient.getSession()`
   - Organization: `authClient.organization.*`
   - 2FA: `authClient.twoFactor.*`

3. **WebSocket Subscriptions**: Real-time updates
   - Market data: `trade.options.volatilitySurface` (subscription)
   - GEX: `trade.options.gammaExposure` (subscription)
   - Signals: `trade.signals.live` (subscription)

4. **Local Storage**: UI preferences
   - Theme, chart settings, layout preferences
   - Not used for sensitive data

---

## Component Hierarchy

### Atomic Design Structure

```
components/
├── ui/                      # Shadcn/ui primitives (buttons, cards, dialogs)
├── wealth/                  # Module 1 components
│   ├── NetWorthWaterfall/
│   ├── AssetAllocationSunburst/
│   ├── AssetCards/
│   │   ├── EPFCard/
│   │   ├── NPSCard/
│   │   ├── InsuranceCard/
│   │   └── CryptoCard/
│   ├── LifeBeatPulse/
│   └── SankeyDiagram/
├── trade/                   # Module 2 components
│   ├── options/
│   │   ├── VolatilitySurface3D/
│   │   ├── MaxPainChart/
│   │   ├── GEXHistogram/
│   │   ├── VannaHeatmap/
│   │   └── CharmCurve/
│   ├── strategies/
│   │   ├── LiveTunerPanel/
│   │   ├── StrategyCanvas/
│   │   └── BacktestResults/
│   └── execution/
│       ├── SlippageScatter/
│       └── LatencyHeatmap/
├── account/                 # Module 3 components
│   ├── ProfileForm/
│   ├── LinkedAccountsList/
│   ├── SecuritySettings/
│   └── NotificationPreferences/
├── organization/            # Module 4 components
│   ├── OrganizationSwitcher/
│   ├── TeamsList/
│   ├── MemberInviteDialog/
│   └── RBACMatrix/
├── admin/                   # Module 5 components
│   ├── ai-models/
│   │   ├── LossCurves/
│   │   ├── LayerActivationHeatmap/
│   │   ├── DriftSpeedometer/
│   │   └── SHAPForcePlot/
│   ├── agents/
│   │   └── TraceWaterfall/
│   ├── risk/
│   │   ├── KillSwitchPanel/
│   │   └── CircuitBreakerConfig/
│   └── compliance/
│       ├── AuditTrailViewer/
│       └── RegulatoryLimitsHeatmap/
└── layouts/
    ├── DashboardLayout/     # Shared layout for all dashboards
    ├── SidebarNav/
    └── HeaderControls/
```

---

## Access Control

### Permission Model

```typescript
type Role = "OWNER" | "ADMIN" | "MANAGER" | "TRADER" | "VIEWER";

interface PermissionMatrix {
  [K in DashboardModule]: {
    [R in Role]: Partial<ModulePermissions>;
  };
}

const PERMISSIONS: PermissionMatrix = {
  wealth: {
    OWNER: { view: true, edit: true, export: true },
    ADMIN: { view: true, edit: true, export: true },
    MANAGER: { view: true, edit: false, export: true },
    TRADER: { view: true, edit: false, export: false },
    VIEWER: { view: true, edit: false, export: false },
  },
  trade: {
    OWNER: {
      viewStrategies: true,
      createStrategies: true,
      executeStrategies: true,
      modifyRiskLimits: true,
    },
    ADMIN: {
      viewStrategies: true,
      createStrategies: true,
      executeStrategies: true,
      modifyRiskLimits: false,
    },
    MANAGER: {
      viewStrategies: true,
      createStrategies: true,
      executeStrategies: false,
      modifyRiskLimits: false,
    },
    TRADER: {
      viewStrategies: true,
      createStrategies: false,
      executeStrategies: true,
      modifyRiskLimits: false,
    },
    VIEWER: {
      viewStrategies: true,
      createStrategies: false,
      executeStrategies: false,
      modifyRiskLimits: false,
    },
  },
  admin: {
    OWNER: {
      viewAIModels: true,
      modifyKillSwitches: true,
      viewAuditTrail: true,
    },
    ADMIN: {
      viewAIModels: true,
      modifyKillSwitches: false,
      viewAuditTrail: true,
    },
    // MANAGER, TRADER, VIEWER: no access
  },
};
```

### Permission Checking Hook

```typescript
// hooks/usePermissions.ts
import { useOrganization } from '@/providers/OrganizationProvider';

export function usePermissions() {
  const { userRole, permissions } = useOrganization();

  const can = (action: string): boolean => {
    const [module, permission] = action.split('.') as [DashboardModule, keyof ModulePermissions];
    return permissions[module]?.[permission] ?? false;
  };

  return { can, role: userRole };
}

// Usage in components:
const { can } = usePermissions();

if (can('trade.executeStrategies')) {
  return <ExecuteButton />;
}
```

---

## Performance Optimization

### Code Splitting

```typescript
// Lazy load heavy visualization libraries
const Plotly3DSurface = dynamic(() => import('@/components/trade/Plotly3DSurface'), {
  loading: () => <Skeleton3D />,
  ssr: false, // disable SSR for plotly
});

const D3SankeyDiagram = dynamic(() => import('@/components/wealth/D3SankeyDiagram'), {
  loading: () => <SkeletonChart />,
  ssr: false,
});
```

### Image Optimization

```typescript
import Image from 'next/image';

// Use Next.js Image component for automatic optimization
<Image
  src="/assets/organization-logo.png"
  alt="Organization Logo"
  width={200}
  height={50}
  priority // for above-the-fold images
/>
```

### Data Caching Strategy

```typescript
// tRPC query with stale-while-revalidate
const { data } = trpc.wealth.getNetWorth.useQuery(undefined, {
  staleTime: 60 * 1000, // 1 minute
  cacheTime: 5 * 60 * 1000, // 5 minutes
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
});

// Admin queries: less frequent refetch
const { data: auditLog } = trpc.admin.compliance.getAuditTrail.useQuery(
  undefined,
  {
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: false, // no background refetch
  }
);
```

### Virtual Scrolling for Large Lists

```typescript
// Use react-window for large datasets
import { FixedSizeList } from 'react-window';

function AuditTrailViewer({ logs }: { logs: AuditLogEntry[] }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={logs.length}
      itemSize={50}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <AuditLogRow log={logs[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

---

## Conclusion

This architecture implements a **truly unified financial platform** that eliminates the traditional separation between trading terminals and wealth management tools. By combining:

- **Multi-dashboard modularity** (Wealth, Trade, Account, Organization, Admin)
- **Organization-first multi-tenancy** with RBAC
- **Highly configurable algorithmic trading** with live parameter tuning
- **Forensic AI observability** with explainability and kill switches
- **Type-safe, real-time data flow** via tRPC and WebSockets

...we create a **best-in-class financial operating system** suitable for retail investors, prosumer traders, and institutional quants alike.

All data flows from the **API server** (via tRPC) and **Better Auth** (for authentication/organization), ensuring a clean separation of concerns and maximum maintainability.