# GitHub Copilot Instructions - Wealth Management Service

## Role & Context

You are working on the **Wealth Management Service** - a MongoDB-based double-entry bookkeeping system for personal finance tracking. This NestJS service implements professional-grade accounting principles with event-driven architecture integration.

## Application Overview

**Purpose**: Core financial ledger system with double-entry bookkeeping  
**Port**: 3005  
**Stack**: NestJS, MongoDB, QuestDB (time-series), Redis (events)

**Responsibilities**:

- Double-entry bookkeeping (Assets = Liabilities + Equity + Income - Expenses)
- Net worth tracking with historical snapshots
- Multi-asset support (bank, demat, crypto, real estate, insurance, loans)
- Tax compliance (FY 2025-26 Indian tax rules)
- Integration with algo-worker trades via Redis Streams
- Financial planning tools (goals, retirement, loan optimization)

---

## Critical Architecture Rules

### 1. MongoDB-First Design (MANDATORY)

**ALL persistence MUST use MongoDB - NO PostgreSQL, NO TimescaleDB for wealth data**

```typescript
// ✅ CORRECT - Use MongoDB via @repo/database
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account, Transaction, Snapshot } from './schemas';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<Account>,
  ) {}

  async createAccount(dto: CreateAccountDto): Promise<Account> {
    return this.accountModel.create(dto);
  }
}

// ❌ WRONG - PostgreSQL schema (never use)
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
@Entity('accounts') // WRONG - no SQL entities
export class Account { ... }
```

**MongoDB Collections**:

- `accounts` - Chart of accounts with hierarchy
- `transactions` - Transactions with embedded postings
- `snapshots` - Net worth snapshots
- `goals` - Financial goals
- `tax_records` - Tax data

**See**: `docs/MONGODB_SCHEMA.md` for complete schema documentation.

---

### 2. Double-Entry Bookkeeping Principles (CRITICAL)

**Every transaction MUST have balanced postings: SUM(debit) = SUM(credit)**

```typescript
// ✅ CORRECT - Atomic transaction with balance check
const session = await mongoose.startSession();
session.startTransaction();

try {
  // Create transaction with postings
  const transaction = await Transaction.create([{
    userId: 'user123',
    organizationId: 'org456',
    transactionDate: new Date(),
    description: 'Salary credited',
    postings: [
      {
        accountId: hdfcSavingsId,
        accountCode: '1100-HDFC-SA',
        accountName: 'HDFC Savings Account',
        debit: 150000, // Debit bank account
        credit: 0,
        currency: 'INR',
        amountInBaseCurrency: 150000
      },
      {
        accountId: salaryIncomeId,
        accountCode: '4100-SALARY',
        accountName: 'Salary Income',
        debit: 0,
        credit: 150000, // Credit income account
        currency: 'INR',
        amountInBaseCurrency: 150000
      }
    ],
    isBalanced: true,
    totalDebit: 150000,
    totalCredit: 150000
  }], { session });

  // Update account balances atomically
  await Account.updateOne(
    { _id: hdfcSavingsId },
    { $inc: { currentBalance: 150000 } }, // Debit increases assets
    { session }
  );

  await Account.updateOne(
    { _id: salaryIncomeId },
    { $inc: { currentBalance: -150000 } }, // Credit increases income (negative convention)
    { session }
  );

  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}

// ❌ WRONG - Missing balance check
const transaction = await Transaction.create({
  postings: [
    { debit: 100 },
    { credit: 90 } // UNBALANCED! Must be 100
  ]
});

// ❌ WRONG - No atomic transaction
await Transaction.create({ postings: [...] });
await Account.updateOne({ _id: id1 }, { $inc: { balance: 100 } });
// If second update fails, database inconsistent!
```

**Accounting Equation**:

- `Assets = Liabilities + Equity + (Income - Expenses)`
- Asset/Expense accounts: Debit increases, Credit decreases
- Liability/Equity/Income accounts: Credit increases, Debit decreases

---

### 3. Event-Driven Integration (MANDATORY)

**ALL external interactions MUST use Redis Streams - NO direct HTTP calls between services**

```typescript
// ✅ CORRECT - Consume algo-worker trade events
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class TradeEventConsumer {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly eventBus: EventBusService,
  ) {}

  @OnEvent('TRADE_EXECUTED')
  async handleTradeExecuted(event: TradeExecutedEvent) {
    // Create wealth transaction from algo trade
    const transaction = await this.transactionService.createFromTrade({
      userId: event.userId,
      organizationId: event.organizationId,
      tradeId: event.tradeId,
      symbol: event.symbol,
      quantity: event.quantity,
      price: event.price,
      totalAmount: event.totalAmount,
    });

    // Publish wealth transaction created event
    await this.eventBus.publish('stream:wealth-events', {
      event: 'WEALTH_TRANSACTION_CREATED',
      userId: event.userId,
      transactionId: transaction._id.toString(),
      category: 'Investment:Options',
      amount: event.totalAmount,
      timestamp: Date.now(),
    });
  }
}

// ❌ WRONG - Direct HTTP call to algo-worker
import { HttpService } from '@nestjs/axios';
const response = await this.httpService
  .get('http://algo-worker:3000/trades')
  .toPromise();
```

**Event Patterns**:

```typescript
// Consume from Redis Streams
const messages = await this.redis.xreadgroup(
  'GROUP',
  'wealth-management',
  'worker-1',
  'BLOCK',
  5000,
  'STREAMS',
  'stream:trade-events',
  '>',
);

// Process events
for (const [stream, streamMessages] of messages) {
  for (const [messageId, fields] of streamMessages) {
    const event = JSON.parse(fields[1]); // fields[0] is 'event', fields[1] is JSON
    await this.handleEvent(event);
    await this.redis.xack(
      'stream:trade-events',
      'wealth-management',
      messageId,
    );
  }
}

// Publish to Redis Streams
await this.redis.xadd(
  'stream:wealth-events',
  '*',
  'event',
  JSON.stringify({
    event: 'WEALTH_TRANSACTION_CREATED',
    userId: 'user123',
    transactionId: transaction._id.toString(),
    timestamp: Date.now(),
  }),
);
```

---

### 4. Shared Package Usage (MANDATORY)

**ALWAYS use shared packages - NEVER duplicate code**

```typescript
// ✅ CORRECT - Use shared packages
import { type Transaction, transactionSchema } from '@repo/schema';
import { InjectModel } from '@nestjs/mongoose';
import { authClient } from '@repo/authentication';

// ❌ WRONG - Local type definitions
interface Transaction { ... } // NEVER
const transactionSchema = z.object({ ... }); // NEVER
```

**Shared Packages**:

- `@repo/schema` - Zod schemas, TypeScript types
- `@repo/database` - MongoDB connection, models
- `@repo/authentication` - Better Auth integration
- `@repo/utils` - Common utilities

---

### 5. Hierarchical Account Structure (IMPORTANT)

**Accounts MUST follow hierarchical structure with embedded path**

```typescript
// ✅ CORRECT - Hierarchical account with pathHierarchy
{
  _id: ObjectId("..."),
  userId: "user123",
  accountCode: "1100-HDFC-SA",
  accountName: "HDFC Savings Account",
  accountType: "ASSET",
  subtype: "BANK",
  parentAccountId: ObjectId("..."), // References 1100-LIQUID
  pathHierarchy: ["Assets", "Liquid", "Bank", "HDFC"], // For fast queries
  level: 4, // 0 = root, 1 = Assets, 2 = Liquid, 3 = Bank, 4 = HDFC
  currentBalance: 250000,
  isActive: true
}

// Query all liquid assets (zero JOINs)
const liquidAssets = await Account.find({
  userId: 'user123',
  pathHierarchy: { $regex: /^Assets,Liquid/ },
  isActive: true
});

// ❌ WRONG - Flat structure requiring JOINs
{
  accountId: 1,
  accountName: "HDFC Savings",
  parentId: 5 // Requires recursive JOINs to get full path
}
```

**Standard Account Hierarchy**:

```
Assets (1000)
  ├── Liquid (1100)
  │     ├── Bank (1110)
  │     │     ├── HDFC Savings (1110-HDFC-SA)
  │     │     └── ICICI Current (1110-ICICI-CA)
  │     └── Cash (1120)
  ├── Locked (1200)
  │     ├── EPF (1210-EPF)
  │     ├── PPF (1210-PPF)
  │     └── NPS (1210-NPS)
  └── Investments (1300)
        ├── Demat (1310-ZERODHA-DEMAT)
        └── Crypto (1320)

Liabilities (2000)
  ├── Loans (2100)
  │     ├── Home Loan (2110-HDFC-HL)
  │     └── Car Loan (2120-ICICI-CAR)
  └── Credit Cards (2200)

Income (4000)
  ├── Salary (4100-SALARY)
  └── Dividends (4200-DIV)

Expenses (5000)
  ├── Groceries (5100-GROCERY)
  └── Utilities (5200-UTIL)
```

---

### 6. Tax Compliance (FY 2025-26)

**Implement Indian tax rules accurately**

```typescript
// ✅ CORRECT - New Tax Regime calculation
calculateTax(income: TaxableIncome): TaxResult {
  const { salary, ltcg, stcg, cryptoVDA, foIncome } = income;

  // Slab rates (FY 2025-26 New Tax Regime)
  const slabs = [
    { min: 0, max: 300000, rate: 0 },
    { min: 300000, max: 700000, rate: 0.05 },
    { min: 700000, max: 1000000, rate: 0.10 },
    { min: 1000000, max: 1200000, rate: 0.15 },
    { min: 1200000, max: 1500000, rate: 0.20 },
    { min: 1500000, max: Infinity, rate: 0.30 }
  ];

  // Standard deduction
  const standardDeduction = salary > 0 ? 75000 : 0;
  const taxableIncome = salary + foIncome - standardDeduction;

  // Compute slab tax
  let tax = 0;
  for (const slab of slabs) {
    if (taxableIncome > slab.min) {
      const taxableInSlab = Math.min(taxableIncome, slab.max) - slab.min;
      tax += taxableInSlab * slab.rate;
    }
  }

  // Rebate u/s 87A (if income <₹12L)
  const rebate = taxableIncome < 1200000 ? Math.min(tax, 25000) : 0;

  // Capital gains tax (separate from slab)
  const ltcgTax = Math.max(ltcg - 125000, 0) * 0.125; // ₹1.25L exemption
  const stcgTax = stcg * 0.20;
  const cryptoTax = cryptoVDA * 0.30; // No deductions

  return {
    totalIncome: salary + ltcg + stcg + cryptoVDA + foIncome,
    taxableIncome,
    taxLiability: tax,
    rebateU87A: rebate,
    capitalGainsTax: ltcgTax + stcgTax + cryptoTax,
    netTaxPayable: tax - rebate + ltcgTax + stcgTax + cryptoTax
  };
}

// ❌ WRONG - Old Tax Regime (deprecated)
const tax = (income - 250000) * 0.05; // Outdated slabs
```

---

## Database Best Practices

### 1. Denormalization for Performance

```typescript
// ✅ CORRECT - Denormalize account details in transaction postings
{
  postings: [
    {
      accountId: ObjectId('...'),
      accountCode: '1100-HDFC-SA', // Denormalized for fast queries
      accountName: 'HDFC Savings Account', // Denormalized for display
      debit: 150000,
      credit: 0,
    },
  ];
}

// Query transactions by account code (no JOIN)
const transactions = await Transaction.find({
  'postings.accountCode': '1100-HDFC-SA',
});

// ❌ WRONG - Normalized structure requiring JOINs
{
  postings: [{ accountId: ObjectId('...'), debit: 150000 }];
}
// Requires lookup to get account name for display
```

### 2. Indexing Strategy

```typescript
// Create indexes in migration or module initialization
@Injectable()
export class DatabaseSetupService implements OnModuleInit {
  async onModuleInit() {
    // accounts collection
    await this.accountModel.collection.createIndex(
      { userId: 1, accountCode: 1 },
      { unique: true },
    );
    await this.accountModel.collection.createIndex({
      userId: 1,
      accountType: 1,
      isActive: 1,
    });
    await this.accountModel.collection.createIndex({ pathHierarchy: 1 });

    // transactions collection
    await this.transactionModel.collection.createIndex({
      userId: 1,
      transactionDate: -1,
    });
    await this.transactionModel.collection.createIndex({
      userId: 1,
      category: 1,
    });
    await this.transactionModel.collection.createIndex({
      'postings.accountId': 1,
    });
    await this.transactionModel.collection.createIndex({
      description: 'text',
      category: 'text',
    });

    // snapshots collection
    await this.snapshotModel.collection.createIndex({
      userId: 1,
      snapshotDate: -1,
    });
  }
}
```

### 3. Aggregation Pipelines for Complex Queries

```typescript
// ✅ CORRECT - Use aggregation for category-wise spending
async getCategorySpending(userId: string, startDate: Date, endDate: Date) {
  return this.transactionModel.aggregate([
    {
      $match: {
        userId,
        transactionDate: { $gte: startDate, $lte: endDate }
      }
    },
    { $unwind: '$postings' },
    {
      $lookup: {
        from: 'accounts',
        localField: 'postings.accountId',
        foreignField: '_id',
        as: 'account'
      }
    },
    { $unwind: '$account' },
    {
      $match: { 'account.accountType': 'EXPENSE' }
    },
    {
      $group: {
        _id: '$category',
        totalSpent: { $sum: '$postings.debit' },
        count: { $sum: 1 }
      }
    },
    { $sort: { totalSpent: -1 } }
  ]);
}
```

---

## Security & Validation

### 1. Input Validation

```typescript
// ✅ CORRECT - Validate with Zod
import { z } from 'zod';

const createTransactionSchema = z.object({
  transactionDate: z.date(),
  description: z.string().min(1).max(500),
  postings: z.array(
    z.object({
      accountId: z.string().regex(/^[0-9a-fA-F]{24}$/), // Valid ObjectId
      debit: z.number().nonnegative(),
      credit: z.number().nonnegative()
    })
  ).min(2), // At least 2 postings for double-entry
  category: z.string().min(1)
});

@Post()
async createTransaction(@Body() dto: z.infer<typeof createTransactionSchema>) {
  const validated = createTransactionSchema.parse(dto); // Throws if invalid

  // Validate balance
  const totalDebit = validated.postings.reduce((sum, p) => sum + p.debit, 0);
  const totalCredit = validated.postings.reduce((sum, p) => sum + p.credit, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) { // Allow 1 paisa tolerance
    throw new BadRequestException('Transaction not balanced');
  }

  return this.transactionService.create(validated);
}
```

### 2. Resource Ownership

```typescript
// ✅ CORRECT - Verify ownership before update
async updateAccount(accountId: string, userId: string, dto: UpdateAccountDto) {
  const account = await this.accountModel.findOne({ _id: accountId, userId });

  if (!account) {
    throw new NotFoundException('Account not found or not owned by user');
  }

  return this.accountModel.updateOne({ _id: accountId }, dto);
}

// ❌ WRONG - No ownership check
async updateAccount(accountId: string, dto: UpdateAccountDto) {
  return this.accountModel.updateOne({ _id: accountId }, dto);
  // User A can update User B's account!
}
```

---

## Performance Optimizations

### 1. Caching with Redis

```typescript
// ✅ CORRECT - Cache account balance in Redis
async getAccountBalance(accountId: string): Promise<number> {
  const cacheKey = `balance:${accountId}`;

  // Try Redis cache
  const cached = await this.redis.get(cacheKey);
  if (cached !== null) {
    return parseFloat(cached);
  }

  // Fallback to MongoDB
  const account = await this.accountModel.findById(accountId);
  const balance = account.currentBalance;

  // Cache for 1 hour
  await this.redis.setex(cacheKey, 3600, balance.toString());

  return balance;
}

// Invalidate cache on transaction
async createTransaction(dto: CreateTransactionDto) {
  const transaction = await this.transactionModel.create(dto);

  // Update account balances
  for (const posting of transaction.postings) {
    await this.accountModel.updateOne(
      { _id: posting.accountId },
      { $inc: { currentBalance: posting.debit - posting.credit } }
    );

    // Invalidate cache
    await this.redis.del(`balance:${posting.accountId}`);
  }

  return transaction;
}
```

### 2. Pagination for Large Queries

```typescript
// ✅ CORRECT - Paginate transactions
async getTransactions(
  userId: string,
  page: number = 1,
  limit: number = 50
): Promise<{ transactions: Transaction[], total: number }> {
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    this.transactionModel
      .find({ userId })
      .sort({ transactionDate: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    this.transactionModel.countDocuments({ userId })
  ]);

  return { transactions, total };
}
```

---

## Testing

### 1. Unit Tests

```typescript
describe('TransactionService', () => {
  let service: TransactionService;
  let model: jest.Mocked<Model<Transaction>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: getModelToken(Transaction.name),
          useValue: {
            create: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(TransactionService);
    model = module.get(getModelToken(Transaction.name));
  });

  it('should create balanced transaction', async () => {
    const dto = {
      postings: [
        { accountId: 'acc1', debit: 100, credit: 0 },
        { accountId: 'acc2', debit: 0, credit: 100 },
      ],
    };

    model.create.mockResolvedValue(dto as any);
    const result = await service.create(dto);

    expect(result.postings.length).toBe(2);
    expect(model.create).toHaveBeenCalledWith(dto);
  });

  it('should reject unbalanced transaction', async () => {
    const dto = {
      postings: [
        { accountId: 'acc1', debit: 100, credit: 0 },
        { accountId: 'acc2', debit: 0, credit: 90 }, // Unbalanced
      ],
    };

    await expect(service.create(dto)).rejects.toThrow('not balanced');
  });
});
```

---

## Common Anti-Patterns to Avoid

❌ Using PostgreSQL or SQL database  
❌ Unbalanced transactions (SUM(debit) ≠ SUM(credit))  
❌ Skipping ACID transactions for multi-document updates  
❌ Direct HTTP calls between services (use Redis Streams)  
❌ Missing account hierarchy (pathHierarchy field)  
❌ No denormalization (forcing JOINs)  
❌ Missing indexes on query fields  
❌ No input validation  
❌ No ownership checks  
❌ Incorrect tax calculations

---

## Documentation

Keep these files updated:

- `README.md` - Service overview, architecture, API endpoints
- `docs/MONGODB_SCHEMA.md` - Complete MongoDB schema reference
- `docs/TAX_RULES.md` - Indian tax calculation rules
- `docs/INTEGRATION.md` - Event-driven integration patterns

---

## References

- [Root Architecture](../../ARCHITECTURE.md) - Project-wide architecture
- [Root Copilot Instructions](../../.github/copilot-instructions.md) - Common patterns
- [MongoDB Double-Entry](https://www.mongodb.com/developer/products/mongodb/double-entry-accounting-example/)
- [Income Tax Act 2025-26](https://www.incometax.gov.in/)
- [RBI Account Aggregator Framework](https://rbi.org.in/)
