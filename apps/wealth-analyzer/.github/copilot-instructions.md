# GitHub Copilot Instructions - Wealth Analyzer Service

## Role & Context

You are working on the **Wealth Analyzer Service** - an AI-powered financial analytics engine that provides insights, recommendations, and natural language query capabilities for personal wealth data. This NestJS service uses Phi-3 (local LLM), RAG, and ML models for advanced financial intelligence.

## Application Overview

**Purpose**: AI-powered financial insights and analytics  
**Port**: 3007  
**Stack**: NestJS, MongoDB (data), Phi-3 (LLM), ChromaDB (vector store), QuestDB (time-series)

**Responsibilities**:

- Natural language queries ("How much did I spend on groceries last month?")
- Financial insights (spending patterns, anomalies, trends)
- Predictive analytics (cash flow forecasting, net worth projections)
- Investment recommendations (tax optimization, asset rebalancing)
- Goal progress monitoring
- Anomaly detection (unusual transactions, duplicate payments)

---

## Critical Architecture Rules

### 1. Local LLM with Phi-3 (MANDATORY)

**ALWAYS use Phi-3 for LLM capabilities - NO cloud APIs (OpenAI, Claude)**

```typescript
// ✅ CORRECT - Use local Phi-3 model
import { Phi3Service } from './phi3/phi3.service';

@Injectable()
export class NaturalLanguageQueryService {
  constructor(private readonly phi3: Phi3Service) {}

  async processQuery(userId: string, query: string): Promise<string> {
    // Retrieve relevant context from ChromaDB
    const context = await this.retrieveContext(userId, query);

    // Generate prompt
    const prompt = this.buildPrompt(query, context);

    // Generate response with Phi-3
    const response = await this.phi3.generate({
      prompt,
      maxTokens: 512,
      temperature: 0.3, // Low temperature for factual responses
      stopSequences: ['\n\nUser:', '\n\nAssistant:']
    });

    return response.text;
  }
}

// ❌ WRONG - Cloud API (violates local-first principle)
import { Configuration, OpenAIApi } from 'openai';
const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));
const response = await openai.createChatCompletion({ ... });
```

**Phi-3 Setup**:

```typescript
// src/phi3/phi3.service.ts
import { spawn } from 'child_process';

@Injectable()
export class Phi3Service {
  private modelPath =
    process.env.PHI3_MODEL_PATH || '../models/phi3-mini-4k-instruct.gguf';

  async generate(params: Phi3GenerateParams): Promise<Phi3Response> {
    // Use llama.cpp or ollama for GGUF model inference
    const process = spawn('ollama', ['run', 'phi3:mini', params.prompt]);

    let output = '';
    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    return new Promise((resolve, reject) => {
      process.on('close', (code) => {
        if (code === 0) {
          resolve({ text: output.trim() });
        } else {
          reject(new Error(`Phi-3 inference failed with code ${code}`));
        }
      });
    });
  }
}
```

**Why Phi-3?**

- **Privacy**: All data stays local (no cloud API calls)
- **Cost**: Zero API fees
- **Latency**: <500ms inference on RTX GPU
- **Offline**: Works without internet

---

### 2. RAG (Retrieval-Augmented Generation) with ChromaDB

**Use ChromaDB for vector search - retrieve relevant transactions/insights before LLM generation**

```typescript
// ✅ CORRECT - RAG pattern with ChromaDB
import { ChromaClient } from 'chromadb';

@Injectable()
export class ContextRetrievalService {
  private client = new ChromaClient();
  private collection: Collection;

  async onModuleInit() {
    this.collection = await this.client.getOrCreateCollection({
      name: 'financial_transactions',
      metadata: { 'hnsw:space': 'cosine' }
    });
  }

  async retrieveContext(userId: string, query: string): Promise<string[]> {
    // Query vector store
    const results = await this.collection.query({
      queryTexts: [query],
      nResults: 5,
      where: { userId }
    });

    // Format retrieved documents
    return results.documents[0].map((doc, i) => {
      const metadata = results.metadatas[0][i];
      return `${metadata.date}: ${metadata.description} - ₹${metadata.amount} (${metadata.category})`;
    });
  }

  async indexTransaction(transaction: Transaction) {
    // Embed transaction description + category
    const text = `${transaction.description} ${transaction.category}`;

    await this.collection.add({
      ids: [transaction._id.toString()],
      documents: [text],
      metadatas: [{
        userId: transaction.userId,
        date: transaction.transactionDate.toISOString(),
        description: transaction.description,
        amount: transaction.postings.reduce((sum, p) => sum + p.debit, 0),
        category: transaction.category
      }]
    });
  }
}

// Prompt building
buildPrompt(query: string, context: string[]): string {
  return `You are a financial assistant. Answer the user's question based on the following transactions:

Transactions:
${context.join('\n')}

User Question: ${query}

Answer (be concise and specific):`;
}
```

**Example RAG Flow**:

```
User Query: "How much did I spend on groceries last month?"
  ↓
1. Embed query with sentence-transformers
2. ChromaDB vector search → retrieve top 5 transactions
3. Context: [
     "2024-11-05: Big Bazaar - ₹2500 (Groceries)",
     "2024-11-12: DMart - ₹1800 (Groceries)",
     ...
   ]
4. Build prompt with context
5. Phi-3 generates: "You spent ₹12,450 on groceries last month across 8 transactions."
```

---

### 3. Event-Driven Analytics (MANDATORY)

**Subscribe to wealth-management events - NO polling MongoDB**

```typescript
// ✅ CORRECT - Subscribe to wealth transaction events
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class TransactionAnalyticsService {
  constructor(
    private readonly anomalyDetector: AnomalyDetectorService,
    private readonly insightGenerator: InsightGeneratorService,
    private readonly contextRetrieval: ContextRetrievalService,
  ) {}

  @OnEvent('WEALTH_TRANSACTION_CREATED')
  async analyzeTransaction(event: WealthTransactionCreatedEvent) {
    // Check for anomalies
    const isAnomaly = await this.anomalyDetector.detect({
      userId: event.userId,
      amount: event.amount,
      category: event.category,
    });

    if (isAnomaly) {
      await this.publishInsight({
        type: 'ANOMALY',
        userId: event.userId,
        message: `Unusual transaction detected: ₹${event.amount} in ${event.category}`,
        severity: 'HIGH',
      });
    }

    // Index for RAG
    await this.contextRetrieval.indexTransaction(event);

    // Generate spending insights (async)
    setImmediate(() =>
      this.insightGenerator.generateSpendingInsights(event.userId),
    );
  }
}

// ❌ WRONG - Polling MongoDB (inefficient)
setInterval(async () => {
  const newTransactions = await Transaction.find({ analyzedAt: null });
  for (const txn of newTransactions) {
    await this.analyzeTransaction(txn);
  }
}, 5000); // Poll every 5 seconds
```

---

### 4. ML Models for Financial Analytics

**Use pre-trained/fine-tuned models for specific tasks - NOT general LLM**

```typescript
// ✅ CORRECT - Use ONNX model for anomaly detection
import * as ort from 'onnxruntime-node';

@Injectable()
export class AnomalyDetectorService {
  private session: ort.InferenceSession;

  async onModuleInit() {
    this.session = await ort.InferenceSession.create(
      '../models/isolation-forest-anomaly.onnx',
      {
        executionProviders: ['cuda', 'cpu'], // GPU if available
      },
    );
  }

  async detect(params: AnomalyDetectParams): Promise<boolean> {
    // Fetch user's historical spending in category
    const history = await this.getHistoricalSpending(
      params.userId,
      params.category,
      { days: 90 },
    );

    // Compute features
    const mean = history.reduce((sum, x) => sum + x, 0) / history.length;
    const stdDev = Math.sqrt(
      history.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) /
        history.length,
    );
    const zScore = (params.amount - mean) / stdDev;

    // Feature vector: [amount, zScore, dayOfWeek, hourOfDay, categoryEncoded]
    const features = new Float32Array([
      params.amount,
      zScore,
      new Date().getDay(),
      new Date().getHours(),
      this.encodeCategoryToOneHot(params.category),
    ]);

    // Run inference
    const feeds = {
      input: new ort.Tensor('float32', features, [1, features.length]),
    };
    const results = await this.session.run(feeds);
    const anomalyScore = results.output.data[0] as number;

    // Threshold: >0.8 = anomaly
    return anomalyScore > 0.8;
  }
}

// ✅ CORRECT - Use XGBoost for cash flow forecasting
@Injectable()
export class CashFlowForecastService {
  private session: ort.InferenceSession;

  async forecastNextMonth(userId: string): Promise<CashFlowForecast> {
    // Fetch 12 months of data from QuestDB
    const history = await this.questdb.query(`
      SELECT date, net_inflow, net_outflow
      FROM cash_flow_monthly
      WHERE userId = '${userId}'
      ORDER BY date DESC
      LIMIT 12
    `);

    // Feature engineering
    const features = this.computeTimeSeriesFeatures(history);

    // XGBoost inference
    const feeds = {
      input: new ort.Tensor('float32', features, [1, features.length]),
    };
    const results = await this.session.run(feeds);

    return {
      forecastedInflow: results.inflow.data[0] as number,
      forecastedOutflow: results.outflow.data[0] as number,
      netCashFlow: results.inflow.data[0] - results.outflow.data[0],
      confidence: 0.85, // From model metadata
    };
  }
}
```

---

### 5. MongoDB + QuestDB Dual-Database Pattern

**Use MongoDB for documents, QuestDB for time-series analytics**

```typescript
// ✅ CORRECT - Use QuestDB for time-series queries
import { Injectable } from '@nestjs/common';
import { QuestDBClient } from '@repo/database';

@Injectable()
export class NetWorthAnalyticsService {
  constructor(
    private readonly questdb: QuestDBClient,
    @InjectModel('Snapshot') private snapshotModel: Model<Snapshot>,
  ) {}

  async getNetWorthTrend(userId: string, days: number): Promise<NetWorthTrend> {
    // Query QuestDB for fast time-series data
    const result = await this.questdb.query(`
      SELECT
        date,
        net_worth,
        AVG(net_worth) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as moving_avg_7d,
        (net_worth - LAG(net_worth) OVER (ORDER BY date)) / LAG(net_worth) OVER (ORDER BY date) * 100 as day_change_pct
      FROM net_worth_timeseries
      WHERE userId = '${userId}'
        AND date >= dateadd('d', -${days}, now())
      ORDER BY date DESC
    `);

    return {
      dataPoints: result.map((row) => ({
        date: row.date,
        netWorth: row.net_worth,
        movingAvg7d: row.moving_avg_7d,
        dayChangePct: row.day_change_pct,
      })),
      currentNetWorth: result[0].net_worth,
      change30d: this.computeChange(result, 30),
      volatility: this.computeVolatility(result),
    };
  }

  async getSpendingByCategory(userId: string, startDate: Date, endDate: Date) {
    // Query MongoDB for aggregation
    return this.snapshotModel.aggregate([
      {
        $match: {
          userId,
          snapshotDate: { $gte: startDate, $lte: endDate },
        },
      },
      { $unwind: '$postings' },
      {
        $group: {
          _id: '$category',
          totalSpent: { $sum: '$postings.debit' },
          avgSpent: { $avg: '$postings.debit' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
    ]);
  }
}
```

---

## Key Features

### 1. Natural Language Query Interface

```typescript
// Example queries supported:
// - "How much did I spend on groceries last month?"
// - "What was my net worth on January 1?"
// - "Show me all transactions over ₹10,000 in November"
// - "Am I on track to meet my retirement goal?"
// - "Which category am I overspending in?"

@Injectable()
export class NLQueryService {
  async processQuery(userId: string, query: string): Promise<QueryResponse> {
    // 1. Intent classification (using Phi-3)
    const intent = await this.classifyIntent(query);

    // 2. Entity extraction (dates, amounts, categories)
    const entities = await this.extractEntities(query);

    // 3. Retrieve context from ChromaDB
    const context = await this.contextRetrieval.retrieve(userId, query);

    // 4. Generate response with Phi-3
    const response = await this.phi3.generate({
      prompt: this.buildQueryPrompt(query, intent, entities, context),
      maxTokens: 256,
      temperature: 0.1, // Very low for factual queries
    });

    return {
      answer: response.text,
      sources: context.map((c) => c.transactionId),
      confidence: 0.92,
    };
  }

  private async classifyIntent(query: string): Promise<QueryIntent> {
    const prompt = `Classify the following financial query into one of these categories:
- SPENDING_QUERY (e.g., "How much did I spend on X?")
- NET_WORTH_QUERY (e.g., "What is my net worth?")
- GOAL_QUERY (e.g., "Am I on track for goal X?")
- TRANSACTION_SEARCH (e.g., "Show me transactions for X")
- INSIGHT_REQUEST (e.g., "Where am I overspending?")

Query: ${query}

Category:`;

    const response = await this.phi3.generate({
      prompt,
      maxTokens: 20,
      temperature: 0.0,
    });
    return response.text.trim() as QueryIntent;
  }
}
```

### 2. Insight Generation

```typescript
@Injectable()
export class InsightGeneratorService {
  async generateMonthlyInsights(userId: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Spending insights
    const spendingTrends = await this.analyzeSpendingTrends(userId);
    if (spendingTrends.increasingCategories.length > 0) {
      insights.push({
        type: 'SPENDING_TREND',
        severity: 'MEDIUM',
        title: `Spending increased in ${spendingTrends.increasingCategories.join(', ')}`,
        message: `Your spending in these categories increased by ${spendingTrends.avgIncrease}% compared to last month.`,
        actionable: true,
        actions: ['Review budget', 'Set spending alerts'],
      });
    }

    // Investment insights
    const assetAllocation = await this.analyzeAssetAllocation(userId);
    if (assetAllocation.equityPercent > 80) {
      insights.push({
        type: 'ASSET_ALLOCATION',
        severity: 'HIGH',
        title: 'High equity concentration detected',
        message: `Your portfolio is ${assetAllocation.equityPercent}% equities. Consider diversifying.`,
        actionable: true,
        actions: ['Rebalance portfolio', 'Add debt instruments'],
      });
    }

    // Goal progress insights
    const goals = await this.analyzeGoalProgress(userId);
    for (const goal of goals) {
      if (goal.behindSchedule) {
        insights.push({
          type: 'GOAL_PROGRESS',
          severity: 'HIGH',
          title: `Goal "${goal.name}" behind schedule`,
          message: `Increase monthly SIP by ₹${goal.requiredIncrease} to stay on track.`,
          actionable: true,
          actions: ['Increase SIP', 'Extend target date'],
        });
      }
    }

    return insights;
  }
}
```

### 3. Anomaly Detection

```typescript
@Injectable()
export class AnomalyDetectorService {
  async detectAnomalies(userId: string): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // 1. Duplicate transaction detection
    const duplicates = await this.detectDuplicates(userId);
    anomalies.push(...duplicates);

    // 2. Unusual spending detection (Isolation Forest)
    const unusualTransactions = await this.detectUnusualSpending(userId);
    anomalies.push(...unusualTransactions);

    // 3. Account balance mismatch
    const balanceMismatches = await this.detectBalanceMismatches(userId);
    anomalies.push(...balanceMismatches);

    return anomalies;
  }

  private async detectDuplicates(userId: string): Promise<Anomaly[]> {
    // Query MongoDB for transactions with same amount, description, date (±1 day)
    const transactions = await Transaction.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: {
            amount: '$postings.debit',
            description: '$description',
            date: {
              $dateToString: { format: '%Y-%m-%d', date: '$transactionDate' },
            },
          },
          count: { $sum: 1 },
          ids: { $push: '$_id' },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);

    return transactions.map((t) => ({
      type: 'DUPLICATE_TRANSACTION',
      severity: 'HIGH',
      transactionIds: t.ids,
      message: `Potential duplicate: ${t._id.description} - ₹${t._id.amount} on ${t._id.date}`,
      confidence: 0.95,
    }));
  }
}
```

### 4. Predictive Analytics

```typescript
@Injectable()
export class PredictiveAnalyticsService {
  async forecastNetWorth(
    userId: string,
    months: number,
  ): Promise<NetWorthForecast> {
    // Fetch historical net worth from QuestDB
    const history = await this.questdb.query(`
      SELECT date, net_worth
      FROM net_worth_timeseries
      WHERE userId = '${userId}'
      ORDER BY date DESC
      LIMIT 365
    `);

    // Use Prophet-like model (ONNX)
    const forecast = await this.timeSeriesForecastModel.predict({
      history: history.map((h) => ({ ds: h.date, y: h.net_worth })),
      periods: months * 30,
    });

    return {
      forecastedValues: forecast.yhat,
      lowerBound: forecast.yhat_lower,
      upperBound: forecast.yhat_upper,
      confidence: 0.8,
      assumptions: [
        'Current income remains stable',
        'Spending patterns remain consistent',
        'Market returns average 12% annually',
      ],
    };
  }

  async predictGoalCompletion(
    goalId: string,
  ): Promise<GoalCompletionPrediction> {
    const goal = await Goal.findById(goalId);
    const contributionHistory = goal.contributionHistory;

    // Linear regression on contribution trend
    const avgMonthlyContribution =
      this.computeAvgContribution(contributionHistory);
    const remainingAmount = goal.targetAmount - goal.currentAmount;
    const monthsToCompletion = Math.ceil(
      remainingAmount / avgMonthlyContribution,
    );

    const predictedDate = new Date();
    predictedDate.setMonth(predictedDate.getMonth() + monthsToCompletion);

    return {
      goalId: goal._id.toString(),
      currentProgress: (goal.currentAmount / goal.targetAmount) * 100,
      predictedCompletionDate: predictedDate,
      onTrack: predictedDate <= goal.targetDate,
      requiredMonthlySIP: remainingAmount / this.monthsUntil(goal.targetDate),
    };
  }
}
```

---

## Security & Performance

### 1. Rate Limiting for LLM Queries

```typescript
// Prevent abuse of Phi-3 inference
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
@UseGuards(ThrottlerGuard)
export class NLQueryController {
  @Post('query')
  @Throttle(10, 60) // 10 queries per minute
  async processQuery(@Body() dto: NLQueryDto) {
    return this.nlQueryService.processQuery(dto.userId, dto.query);
  }
}
```

### 2. Caching Insights

```typescript
// Cache insights for 1 hour
async generateInsights(userId: string): Promise<Insight[]> {
  const cacheKey = `insights:${userId}`;

  const cached = await this.redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const insights = await this.insightGenerator.generateMonthlyInsights(userId);

  await this.redis.setex(cacheKey, 3600, JSON.stringify(insights));

  return insights;
}
```

---

## Testing

```typescript
describe('AnomalyDetectorService', () => {
  it('should detect duplicate transactions', async () => {
    const anomalies = await service.detectDuplicates('user123');
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].type).toBe('DUPLICATE_TRANSACTION');
  });

  it('should detect unusual spending', async () => {
    const isAnomaly = await service.detect({
      userId: 'user123',
      amount: 50000, // Unusual grocery spend
      category: 'Groceries',
    });
    expect(isAnomaly).toBe(true);
  });
});
```

---

## Environment Variables

```bash
PORT=3007
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/wealth

# QuestDB
QUESTDB_HOST=localhost
QUESTDB_PORT=9009

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Phi-3 Model
PHI3_MODEL_PATH=../models/phi3-mini-4k-instruct.gguf
OLLAMA_HOST=http://localhost:11434

# ChromaDB
CHROMADB_HOST=localhost
CHROMADB_PORT=8000

# ML Models
ANOMALY_MODEL_PATH=../models/isolation-forest-anomaly.onnx
FORECAST_MODEL_PATH=../models/prophet-forecast.onnx
```

---

## Common Anti-Patterns to Avoid

❌ Using cloud LLM APIs (OpenAI, Claude)  
❌ Polling MongoDB for new transactions  
❌ Missing RAG (generating responses without context)  
❌ No anomaly detection  
❌ Storing embeddings in MongoDB (use ChromaDB)  
❌ Generating insights synchronously (use background jobs)  
❌ No rate limiting on LLM queries

---

## References

- [Phi-3 Model](https://huggingface.co/microsoft/Phi-3-mini-4k-instruct)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [ONNX Runtime Node.js](https://onnxruntime.ai/docs/get-started/with-javascript.html)
- [Root Architecture](../../ARCHITECTURE.md)
- [Root Copilot Instructions](../../.github/copilot-instructions.md)
