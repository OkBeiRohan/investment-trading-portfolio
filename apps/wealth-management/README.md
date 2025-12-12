# Wealth Management Service

> **Professional-grade personal wealth management with double-entry bookkeeping, real-time analytics, and AI-powered insights.**

## Overview

The **Wealth Management Service** is the core financial ledger system for the investment trading portfolio platform. It implements industry-standard double-entry bookkeeping principles to provide accurate, auditable tracking of:

- **Assets**: Bank accounts, demat holdings, crypto wallets, real estate, insurance
- **Liabilities**: Loans, credit cards, chit fund obligations
- **Income**: Salary, dividends, capital gains, rental income
- **Expenses**: Living costs, investments, EMIs, insurance premiums
- **Net Worth Tracking**: Real-time calculation with historical snapshots

**Port**: 3005  
**Architecture**: Event-driven with Redis Streams  
**Database**: MongoDB (PRIMARY - documents, transactions), QuestDB (time-series net worth), Redis (hot state)  
**Transport**: tRPC (API), Redis Streams (events)

---

## Key Features

### 1. **Double-Entry Bookkeeping System**

Implements the accounting equation: `Assets = Liabilities + Equity + (Income - Expenses)`

- Every transaction affects at least two accounts (debit and credit)
- Mathematically guaranteed balance (sum of all postings per transaction = 0)
- Support for hierarchical accounts (e.g., Expenses → Food → Groceries)
- Multi-currency support with automatic conversion

### 2. **Automated Data Ingestion**

- **Account Aggregator Integration**: RBI-compliant data fetching via Setu/Finvu
- **Bank Statement Parsing**: AI-powered extraction from PDF/CSV
- **API Integrations**:
  - Zerodha Kite Connect (stocks, F&O)
  - Crypto exchanges (Binance, WazirX)
  - Insurance aggregators (PolicyBazaar)
- **Manual Entry**: User-friendly transaction creation

### 3. **Advanced Analytics**

- **Net Worth Dashboard**: Real-time calculation with historical trends
- **Asset Allocation**: Sunburst charts showing portfolio distribution
- **Cash Flow Analysis**: Income vs Expense tracking with category breakdown
- **Investment Performance**: XIRR, CAGR, absolute returns
- **Tax Optimization**: FY 2025-26 New Tax Regime vs Old Tax Regime calculator
- **Emergency Fund Calculator**: Dynamic targets based on essential expenses

### 4. **Indian Tax Compliance (FY 2025-26)**

- **Income Tax**: New Tax Regime with ₹12L rebate u/s 87A
- **Capital Gains**:
  - LTCG/STCG for equity (12.5%/20%)
  - Crypto VDA (30% flat, no set-off)
  - F&O (Non-speculative business income, 8-year loss carry-forward)
- **TDS Tracking**: Automatic reconciliation with Form 26AS
- **ITR Data Export**: Pre-filled JSON for ITR filing

### 5. **Financial Planning Tools**

- **Retirement Planner**: Monte Carlo simulations
- **Goal Tracker**: SIP calculator, corpus target dates
- **Loan Optimizer**: EMI vs Prepayment analysis
- **Insurance Gap Analysis**: Coverage adequacy checks

---

<p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
