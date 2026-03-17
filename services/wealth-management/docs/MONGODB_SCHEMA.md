# MongoDB Schema - Wealth Management

> **Last Updated**: March 17, 2026

> **MongoDB-based double-entry bookkeeping system aligned with existing architecture**

## Design Philosophy

Following the project's **event-driven architecture** principle:

- **MongoDB**: PRIMARY database for wealth management (documents, relationships, complex queries)
- **QuestDB**: Time-series data (net worth snapshots, performance metrics)
- **Redis**: Hot state cache (real-time balances, pending transactions)

**Why MongoDB for Wealth Management:**

- Flexible schema for heterogeneous account types (bank, demat, crypto, real estate)
- Nested documents eliminate JOINs (account hierarchies, transaction postings)
- ACID transactions for double-entry bookkeeping integrity
- Horizontal scaling for multi-user platform

---

## Collections

### 1. **accounts** Collection

Stores the chart of accounts with hierarchical structure.

```typescript
interface Account {
  _id: ObjectId;
  userId: string; // References users collection
  organizationId: string; // Multi-tenancy support

  // Account Identification
  accountCode: string; // Unique code (e.g., "1100-HDFC-SA", "2200-HOMELOAN")
  accountName: string; // Human-readable name
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  subtype: string; // "BANK", "DEMAT", "CRYPTO", "LOAN", "CC", "SALARY", etc.

  // Hierarchy (Embedded for Zero-JOIN)
  parentAccountId?: ObjectId; // Reference to parent account
  pathHierarchy: string[]; // ["Assets", "Liquid", "Bank", "HDFC"] for fast queries
  level: number; // 0 = root, 1 = Assets, 2 = Liquid, 3 = Bank, 4 = HDFC

  // Metadata
  currency: string; // "INR", "USD", "BTC"
  description?: string;
  externalProvider?: {
    name: string; // "Zerodha", "HDFC Bank", "Binance"
    accountId: string; // External account ID
    linkedAt: Date;
    lastSync?: Date;
  };

  // Balance Tracking
  currentBalance: number; // Cached for performance (updated by transactions)

  // Status
  isActive: boolean;
  isArchived: boolean;

  // Audit
  createdAt: Date;
  updatedAt: Date;

  // Indexes
  // Compound index: { userId: 1, accountCode: 1 } (unique)
  // Compound index: { userId: 1, accountType: 1, isActive: 1 }
  // Index: { pathHierarchy: 1 } for hierarchy queries
}
```

**Sample Documents:**

```json
// Root Asset Account
{
  "_id": ObjectId("..."),
  "userId": "user123",
  "organizationId": "org456",
  "accountCode": "1000-ASSETS",
  "accountName": "Assets",
  "accountType": "ASSET",
  "subtype": "ROOT",
  "pathHierarchy": ["Assets"],
  "level": 1,
  "currency": "INR",
  "currentBalance": 5000000,
  "isActive": true,
  "isArchived": false,
  "createdAt": ISODate("2024-01-01T00:00:00Z"),
  "updatedAt": ISODate("2024-12-05T10:30:00Z")
}

// Bank Account (Child of Liquid Assets)
{
  "_id": ObjectId("..."),
  "userId": "user123",
  "organizationId": "org456",
  "accountCode": "1100-HDFC-SA",
  "accountName": "HDFC Savings Account",
  "accountType": "ASSET",
  "subtype": "BANK",
  "parentAccountId": ObjectId("..."), // 1100-LIQUID
  "pathHierarchy": ["Assets", "Liquid", "Bank", "HDFC"],
  "level": 4,
  "currency": "INR",
  "externalProvider": {
    "name": "HDFC Bank",
    "accountId": "50100XXXXXXX",
    "linkedAt": ISODate("2024-01-01T00:00:00Z"),
    "lastSync": ISODate("2024-12-05T08:00:00Z")
  },
  "currentBalance": 250000,
  "isActive": true,
  "isArchived": false,
  "createdAt": ISODate("2024-01-01T00:00:00Z"),
  "updatedAt": ISODate("2024-12-05T10:30:00Z")
}
```

---

### 2. **transactions** Collection

Stores financial transactions with embedded postings (double-entry).

```typescript
interface Transaction {
  _id: ObjectId;
  userId: string;
  organizationId: string;

  // Transaction Metadata
  transactionDate: Date; // When transaction occurred
  postingDate: Date; // When recorded in ledger (can differ for backdated entries)
  description: string;
  reference?: string; // Invoice number, order ID, etc.

  // Embedded Postings (Double-Entry)
  postings: {
    accountId: ObjectId; // References accounts._id
    accountCode: string; // Denormalized for fast queries
    accountName: string; // Denormalized for display
    debit: number; // Positive if debit side
    credit: number; // Positive if credit side
    currency: string;
    exchangeRate?: number; // If multi-currency
    amountInBaseCurrency: number; // Converted to user's base currency (INR)
  }[];

  // Validation (computed on insert)
  isBalanced: boolean; // SUM(debit) = SUM(credit)
  totalDebit: number;
  totalCredit: number;

  // Categorization
  category: string; // "Groceries", "Salary", "Investment", "EMI"
  tags: string[]; // ["essential", "discretionary", "tax-deductible"]

  // Source Tracking
  source: {
    type: 'MANUAL' | 'API' | 'STATEMENT_IMPORT' | 'ALGO_TRADE' | 'WEBHOOK';
    provider?: string; // "Zerodha", "HDFC Bank", "algo-worker"
    externalId?: string; // Trade ID, transaction ID from external system
    importBatchId?: ObjectId; // For bulk imports
  };

  // Reconciliation
  isReconciled: boolean;
  reconciledAt?: Date;
  reconciledBy?: string;

  // Attachments
  attachments: {
    fileId: ObjectId; // GridFS or S3 reference
    fileName: string;
    fileType: string; // "PDF", "JPG", "CSV"
    uploadedAt: Date;
  }[];

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // User ID or system identifier

  // Indexes
  // Compound index: { userId: 1, transactionDate: -1 }
  // Compound index: { userId: 1, category: 1 }
  // Index: { postings.accountId: 1 } for account-specific queries
  // Text index: { description: "text", category: "text" }
}
```

**Sample Transaction (Salary Credit):**

```json
{
  "_id": ObjectId("..."),
  "userId": "user123",
  "organizationId": "org456",
  "transactionDate": ISODate("2024-12-01T00:00:00Z"),
  "postingDate": ISODate("2024-12-01T10:00:00Z"),
  "description": "Salary credited - December 2024",
  "reference": "SAL/2024/12",

  "postings": [
    {
      "accountId": ObjectId("..."),
      "accountCode": "1100-HDFC-SA",
      "accountName": "HDFC Savings Account",
      "debit": 150000,
      "credit": 0,
      "currency": "INR",
      "amountInBaseCurrency": 150000
    },
    {
      "accountId": ObjectId("..."),
      "accountCode": "4100-SALARY",
      "accountName": "Salary Income",
      "debit": 0,
      "credit": 150000,
      "currency": "INR",
      "amountInBaseCurrency": 150000
    }
  ],

  "isBalanced": true,
  "totalDebit": 150000,
  "totalCredit": 150000,

  "category": "Income:Salary",
  "tags": ["recurring", "taxable"],

  "source": {
    "type": "API",
    "provider": "HDFC Bank",
    "externalId": "TXN123456789"
  },

  "isReconciled": true,
  "reconciledAt": ISODate("2024-12-01T10:05:00Z"),

  "attachments": [],

  "createdAt": ISODate("2024-12-01T10:00:00Z"),
  "updatedAt": ISODate("2024-12-01T10:05:00Z"),
  "createdBy": "user123"
}
```

**Sample Transaction (Stock Purchase via Algo-Worker):**

```json
{
  "_id": ObjectId("..."),
  "userId": "user123",
  "organizationId": "org456",
  "transactionDate": ISODate("2024-12-05T09:15:23Z"),
  "postingDate": ISODate("2024-12-05T09:15:23Z"),
  "description": "Bought 50 NIFTY 23500 CE @ ₹120",
  "reference": "ALGO-TRADE-1234567",

  "postings": [
    {
      "accountId": ObjectId("..."),
      "accountCode": "1200-ZERODHA-DEMAT",
      "accountName": "Zerodha Demat Account",
      "debit": 6000,
      "credit": 0,
      "currency": "INR",
      "amountInBaseCurrency": 6000
    },
    {
      "accountId": ObjectId("..."),
      "accountCode": "1100-HDFC-SA",
      "accountName": "HDFC Savings Account",
      "debit": 0,
      "credit": 6000,
      "currency": "INR",
      "amountInBaseCurrency": 6000
    }
  ],

  "isBalanced": true,
  "totalDebit": 6000,
  "totalCredit": 6000,

  "category": "Investment:Options",
  "tags": ["algo-trade", "nifty-options"],

  "source": {
    "type": "ALGO_TRADE",
    "provider": "algo-worker",
    "externalId": "trade-1234567"
  },

  "isReconciled": false,

  "attachments": [],

  "createdAt": ISODate("2024-12-05T09:15:23Z"),
  "updatedAt": ISODate("2024-12-05T09:15:23Z"),
  "createdBy": "system:algo-worker"
}
```

---

### 3. **snapshots** Collection

Stores net worth and account balance snapshots for historical tracking.

```typescript
interface Snapshot {
  _id: ObjectId;
  userId: string;
  organizationId: string;

  // Snapshot Timing
  snapshotDate: Date; // Date of snapshot
  snapshotType:
    | 'DAILY'
    | 'WEEKLY'
    | 'MONTHLY'
    | 'QUARTERLY'
    | 'YEARLY'
    | 'ON_DEMAND';

  // Net Worth Breakdown
  netWorth: {
    totalAssets: number;
    totalLiabilities: number;
    netWorthValue: number; // totalAssets - totalLiabilities
    currency: string;
  };

  // Account Balances (Snapshot of all accounts)
  accountBalances: {
    accountId: ObjectId;
    accountCode: string;
    accountName: string;
    accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
    balance: number;
    currency: string;
  }[];

  // Asset Allocation (Grouped)
  assetAllocation: {
    liquid: number; // Cash + Bank
    locked: number; // EPF + PPF + NPS
    equities: number; // Stocks + Mutual Funds
    realestate: number;
    crypto: number;
    other: number;
  };

  // Liability Breakdown
  liabilities: {
    loans: number; // Home Loan + Car Loan
    creditCards: number;
    chitFunds: number;
    other: number;
  };

  // Performance Metrics (Optional, can be in QuestDB)
  returns?: {
    oneDayChange: number; // Change since yesterday
    oneWeekChange: number;
    oneMonthChange: number;
    ytdChange: number; // Year-to-date
    oneYearReturn: number; // CAGR for 1 year
  };

  // Audit
  createdAt: Date;

  // Indexes
  // Compound index: { userId: 1, snapshotDate: -1 }
  // Compound index: { userId: 1, snapshotType: 1, snapshotDate: -1 }
}
```

**Sample Snapshot:**

```json
{
  "_id": ObjectId("..."),
  "userId": "user123",
  "organizationId": "org456",
  "snapshotDate": ISODate("2024-12-05T00:00:00Z"),
  "snapshotType": "DAILY",

  "netWorth": {
    "totalAssets": 5000000,
    "totalLiabilities": 1500000,
    "netWorthValue": 3500000,
    "currency": "INR"
  },

  "accountBalances": [
    {
      "accountId": ObjectId("..."),
      "accountCode": "1100-HDFC-SA",
      "accountName": "HDFC Savings Account",
      "accountType": "ASSET",
      "balance": 250000,
      "currency": "INR"
    },
    {
      "accountId": ObjectId("..."),
      "accountCode": "1200-ZERODHA-DEMAT",
      "accountName": "Zerodha Demat Account",
      "accountType": "ASSET",
      "balance": 1500000,
      "currency": "INR"
    }
    // ... more accounts
  ],

  "assetAllocation": {
    "liquid": 500000,
    "locked": 800000,
    "equities": 2500000,
    "realestate": 1000000,
    "crypto": 200000,
    "other": 0
  },

  "liabilities": {
    "loans": 1400000,
    "creditCards": 50000,
    "chitFunds": 50000,
    "other": 0
  },

  "returns": {
    "oneDayChange": 15000,
    "oneWeekChange": 75000,
    "oneMonthChange": 120000,
    "ytdChange": 450000,
    "oneYearReturn": 12.5
  },

  "createdAt": ISODate("2024-12-05T00:00:00Z")
}
```

**Note**: For high-frequency time-series queries (daily net worth charts), consider replicating snapshot data to **QuestDB** for faster queries. MongoDB snapshots serve as authoritative source.

---

### 4. **goals** Collection

Stores financial goals with progress tracking.

```typescript
interface Goal {
  _id: ObjectId;
  userId: string;
  organizationId: string;

  // Goal Details
  goalName: string; // "Retirement Corpus", "House Down Payment", "Child Education"
  goalType:
    | 'RETIREMENT'
    | 'HOUSE'
    | 'EDUCATION'
    | 'EMERGENCY_FUND'
    | 'VACATION'
    | 'OTHER';

  // Target
  targetAmount: number;
  currency: string;
  targetDate: Date;

  // Current Progress
  currentAmount: number;
  contributionHistory: {
    date: Date;
    amount: number;
    source: string; // "manual", "SIP", "bonus"
  }[];

  // Tracking
  linkedAccounts: ObjectId[]; // References accounts (e.g., SIP account)
  autoContribute?: {
    enabled: boolean;
    frequency: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    amount: number;
    nextContributionDate: Date;
  };

  // Analytics
  projectedCompletion?: Date; // Based on current contribution rate
  requiredMonthlySIP?: number; // To meet target by targetDate

  // Status
  status: 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';

  // Audit
  createdAt: Date;
  updatedAt: Date;

  // Indexes
  // Compound index: { userId: 1, status: 1 }
}
```

---

### 5. **tax_records** Collection

Stores tax-related data for ITR filing.

```typescript
interface TaxRecord {
  _id: ObjectId;
  userId: string;
  organizationId: string;

  // Financial Year
  assessmentYear: string; // "AY2025-26"
  financialYear: string; // "FY2024-25"

  // Income
  salaryIncome: number;
  capitalGains: {
    stcgEquity: number; // 20%
    ltcgEquity: number; // 12.5% (>₹1.25L)
    stcgDebt: number; // Slab rate
    ltcgDebt: number; // 12.5%
    cryptoVDA: number; // 30% flat
  };
  businessIncome: number; // F&O income
  otherIncome: number; // Interest, dividends

  // Deductions (New Tax Regime FY2024-25)
  standardDeduction: number; // ₹75,000 for salaried
  section80C?: number; // Not available in new regime
  section80D?: number; // Not available in new regime
  // (Old regime deductions can be stored if user opts for it)

  // TDS
  tdsDeducted: number;
  advanceTax: number;
  selfAssessmentTax: number;

  // Tax Calculation
  totalIncome: number;
  taxableIncome: number;
  taxLiability: number;
  rebateU87A: number; // ₹25,000 if income <₹7L (New Regime <₹12L from FY2025-26)
  netTaxPayable: number;

  // ITR Filing
  itrFiled: boolean;
  itrFiledDate?: Date;
  acknowledgementNumber?: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;

  // Indexes
  // Compound index: { userId: 1, assessmentYear: 1 } (unique)
}
```

---

## Event-Driven Integration

### Redis Streams Events

**Publish Events (wealth-management → Redis)**:

```typescript
// When new transaction is created
{
  event: 'WEALTH_TRANSACTION_CREATED',
  userId: 'user123',
  organizationId: 'org456',
  transactionId: ObjectId('...'),
  transactionDate: '2024-12-05T09:15:23Z',
  category: 'Investment:Options',
  amount: 6000,
  source: 'algo-worker',
  timestamp: Date.now()
}

// When net worth snapshot is created
{
  event: 'WEALTH_SNAPSHOT_CREATED',
  userId: 'user123',
  organizationId: 'org456',
  snapshotId: ObjectId('...'),
  snapshotDate: '2024-12-05T00:00:00Z',
  netWorthValue: 3500000,
  oneDayChange: 15000,
  timestamp: Date.now()
}
```

**Consume Events (Redis → wealth-management)**:

```typescript
// Listen for algo-worker trade execution
{
  event: 'TRADE_EXECUTED',
  userId: 'user123',
  tradeId: 'trade-1234567',
  symbol: 'NIFTY 23500 CE',
  quantity: 50,
  price: 120,
  side: 'BUY',
  totalAmount: 6000,
  timestamp: Date.now()
}
// Action: Create transaction in wealth-management with postings:
// Debit: Demat Account, Credit: Bank Account
```

---

## Database Operations

### ACID Transactions (Critical for Double-Entry)

```typescript
// Create transaction with postings atomically
const session = await mongoose.startSession();
session.startTransaction();

try {
  // 1. Insert transaction
  const transaction = await Transaction.create(
    [
      {
        userId: 'user123',
        organizationId: 'org456',
        postings: [
          /* ... */
        ],
      },
    ],
    { session },
  );

  // 2. Update account balances
  for (const posting of transaction.postings) {
    await Account.updateOne(
      { _id: posting.accountId },
      { $inc: { currentBalance: posting.debit - posting.credit } },
      { session },
    );
  }

  // 3. Commit
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

### Queries

```typescript
// Get user's net worth
const netWorth = await Snapshot.findOne({
  userId: 'user123',
  snapshotType: 'DAILY',
})
  .sort({ snapshotDate: -1 })
  .limit(1);

// Get transactions for a date range
const transactions = await Transaction.find({
  userId: 'user123',
  transactionDate: {
    $gte: new Date('2024-01-01'),
    $lte: new Date('2024-12-31'),
  },
})
  .sort({ transactionDate: -1 })
  .limit(100);

// Get account hierarchy
const accounts = await Account.find({
  userId: 'user123',
  pathHierarchy: { $regex: /^Assets/ }, // All asset accounts
  isActive: true,
}).sort({ pathHierarchy: 1 });
```

---

## Performance Optimizations

### 1. Denormalization

- Store `accountCode` and `accountName` in transaction postings (avoid JOINs)
- Cache `currentBalance` in accounts (updated atomically with transactions)

### 2. Indexing Strategy

```typescript
// accounts collection
db.accounts.createIndex({ userId: 1, accountCode: 1 }, { unique: true });
db.accounts.createIndex({ userId: 1, accountType: 1, isActive: 1 });
db.accounts.createIndex({ pathHierarchy: 1 });

// transactions collection
db.transactions.createIndex({ userId: 1, transactionDate: -1 });
db.transactions.createIndex({ userId: 1, category: 1 });
db.transactions.createIndex({ 'postings.accountId': 1 });
db.transactions.createIndex({ description: 'text', category: 'text' });

// snapshots collection
db.snapshots.createIndex({ userId: 1, snapshotDate: -1 });
db.snapshots.createIndex({ userId: 1, snapshotType: 1, snapshotDate: -1 });

// goals collection
db.goals.createIndex({ userId: 1, status: 1 });

// tax_records collection
db.tax_records.createIndex({ userId: 1, assessmentYear: 1 }, { unique: true });
```

### 3. Sharding (Future)

For multi-tenant scaling, shard on `userId` or `organizationId`:

```typescript
sh.shardCollection('wealth.accounts', { userId: 'hashed' });
sh.shardCollection('wealth.transactions', {
  userId: 'hashed',
  transactionDate: 1,
});
sh.shardCollection('wealth.snapshots', { userId: 'hashed', snapshotDate: -1 });
```

---

## Migration from PostgreSQL (If Needed)

If you have existing PostgreSQL data:

```typescript
// Migration script (pseudocode)
const pgTransactions = await pgClient.query('SELECT * FROM transactions');

for (const pgTxn of pgTransactions.rows) {
  const postings = await pgClient.query(
    'SELECT * FROM postings WHERE transaction_id = $1',
    [pgTxn.id]
  );

  await Transaction.create({
    userId: pgTxn.user_id,
    organizationId: pgTxn.organization_id,
    transactionDate: pgTxn.transaction_date,
    description: pgTxn.description,
    postings: postings.rows.map(p => ({
      accountId: /* map account */,
      accountCode: p.account_code,
      accountName: p.account_name,
      debit: p.debit,
      credit: p.credit,
      currency: p.currency,
      amountInBaseCurrency: p.amount_in_base_currency
    })),
    // ... other fields
  });
}
```

---

## References

- [MongoDB Double-Entry Bookkeeping](https://www.mongodb.com/developer/products/mongodb/double-entry-accounting-example/)
- [Accounting Principles](https://www.accountingtools.com/articles/what-is-double-entry-accounting.html)
- [Income Tax Act 2025-26](https://www.incometax.gov.in/)
