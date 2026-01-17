# Personal Finance Management Services

> **Double-entry ledger, AI insights, and automated document processing for comprehensive wealth management.**

**Last Updated**: January 18, 2026

---

## Overview

The personal finance management suite consists of three microservices:

| Service | Purpose | Technology |
|---------|---------|------------|
| **wealth-management** | Double-entry ledger, net worth tracking | NestJS, MongoDB |
| **wealth-analyzer** | AI-powered financial insights | Python, Phi-3 LLM |
| **document-processor** | Bank statement OCR, transaction extraction | Python, LayoutLMv3 |

---

## 1. Double-Entry Ledger System

### Fundamental Equation

```
Assets = Liabilities + Equity + Income - Expenses
```

### Account Types

| Type | Description | Examples |
|------|-------------|----------|
| ASSET | Resources owned | Bank accounts, stocks, property |
| LIABILITY | Debts owed | Loans, credit cards |
| EQUITY | Net worth | Capital account |
| INCOME | Money received | Salary, dividends, interest |
| EXPENSE | Money spent | Rent, groceries, utilities |

### Key Features

- **Mathematical consistency**: Debits always equal credits
- **Multi-account tracking**: Bank, demat, crypto, loans, insurance
- **Real-time net worth**: With historical snapshots
- **Multi-currency support**: INR, USD with exchange rates

---

## 2. AI-Powered Insights (wealth-analyzer)

### Technology Stack

- **LLM**: Microsoft Phi-3 Mini (4K context, runs locally on GPU)
- **Framework**: FastAPI (Python)
- **Use Cases**: Spending analysis, savings recommendations, anomaly detection

### Capabilities

1. **Spending Pattern Analysis**
   - Category breakdown (needs vs wants)
   - Trend analysis over time
   - Comparison with previous periods

2. **Predictive Cash Flow**
   - Recurring expense detection
   - Future balance projections
   - Bill payment reminders

3. **Investment Recommendations**
   - Asset allocation suggestions
   - Rebalancing alerts
   - Tax-loss harvesting opportunities

4. **Natural Language Queries**
   - "How much did I spend on dining last month?"
   - "What's my savings rate?"
   - "Can I afford a ₹50,000 purchase?"

---

## 3. Document Processor

### Technology Stack

- **OCR Model**: LayoutLMv3 (Microsoft)
- **PDF Processing**: PyMuPDF
- **Entity Extraction**: Custom NER for Indian financial documents

### Supported Documents

| Document Type | Extracted Data |
|---------------|----------------|
| Bank Statements | Transactions, balances, account info |
| Credit Card Bills | Transactions, due dates, limits |
| Mutual Fund Statements | Holdings, NAV, returns |
| Tax Documents | Form 16, 26AS extractors |

### Processing Pipeline

```
PDF Upload → Text Extraction → Layout Analysis → Entity Recognition → Transaction Mapping → Categorization
```

---

## 4. Financial Planning Features

### Retirement Planner

- Monte Carlo simulations for portfolio projections
- Inflation-adjusted corpus calculations
- Social security integration

### SIP Goal Tracker

- Target-based SIP calculations
- Progress visualization
- Shortfall alerts

### Loan Optimizer

- EMI vs prepayment analysis
- Balance transfer recommendations
- Interest savings calculator

### Tax Planner (FY 2025-26)

- Old vs New regime comparison
- Section 80C optimization
- Capital gains tax preview

---

## 5. Data Integrations

### Account Aggregator (RBI Compliant)

- Setu AA integration
- Consent-based data fetching
- Bank account auto-sync

### Broker APIs

- Zerodha Kite Connect
- Upstox API
- Groww integration

### Crypto Exchanges

- Binance API
- WazirX API
- CoinDCX API

---

## API Examples

### Get Net Worth

```typescript
const netWorth = await trpc.wealth.getNetWorth.query();
// Returns: { assets: 1500000, liabilities: 200000, netWorth: 1300000 }
```

### Record Expense

```typescript
await trpc.wealth.recordExpense.mutate({
  date: new Date(),
  description: 'Grocery shopping',
  amount: 2500,
  category: 'Food & Groceries',
  paymentAccountId: 'acc_savings_hdfc'
});
```

### Get AI Insights

```typescript
const insights = await trpc.wealth.getAIInsights.query();
// Returns array of personalized recommendations
```

---

## Related Documentation

- [README.md](../README.md) - Project overview
- [WEB_API_SERVICES.md](./WEB_API_SERVICES.md) - Dashboard and API
- [ml/README.md](./ml/README.md) - AI/ML documentation
