# Wealth Analyzer Service

> **AI-powered financial analytics with local Phi-3 LLM, RAG-enhanced insights, and predictive analytics for holistic wealth management.**

## Overview

The **Wealth Analyzer Service** is the AI/ML intelligence layer for the wealth management platform. It provides natural language query processing, anomaly detection, spending insights, and predictive analytics—all powered by locally-hosted AI models for maximum privacy and zero API costs.

**Port**: 3007 (HTTP), 50055 (gRPC)  
**Framework**: NestJS + TypeScript  
**Architecture**: Event-driven with Redis Streams  
**Database**: MongoDB (PRIMARY - analytics cache), QuestDB (time-series queries), ChromaDB (vector store)  
**AI Stack**: Phi-3 (local LLM), ONNX Runtime (ML inference), ChromaDB (RAG)  
**Transport**: tRPC (API), Redis Streams (events)

---

## Key Features

### 1. **Natural Language Query Interface**

Ask questions about your finances in plain English:

```
User: "How much did I spend on groceries last month?"
AI: "You spent ₹12,450 on groceries in November 2024 across 8 transactions."

User: "Am I on track to meet my retirement goal?"
AI: "Yes, you are on track. At your current SIP rate of ₹25,000/month,
     you will reach your goal of ₹2 crores in 18 years."

User: "What's my biggest expense category this year?"
AI: "Housing (₹4.2L) is your biggest expense, followed by Transport (₹1.8L)
     and Food (₹1.5L)."
```

**How It Works**:

1. **Intent Classification**: Detect query type (spending, net worth, goals, etc.)
2. **Entity Extraction**: Extract categories, dates, amounts
3. **RAG Context Retrieval**: Fetch relevant context from ChromaDB
4. **Prompt Generation**: Build structured prompt with context
5. **LLM Response**: Phi-3 generates natural language answer

### 2. **AI-Powered Insights**

Automated insights delivered daily/weekly:

- **Spending Trends**: "You spent 25% more on utilities this month"
- **Anomaly Detection**: "Unusual transaction: ₹45,000 credit card payment"
- **Optimization Suggestions**: "You can save ₹5,000/month by switching to a prepaid electricity plan"
- **Investment Recommendations**: "Consider rebalancing: Your equity allocation is 78% (target: 70%)"

### 3. **Predictive Analytics**

ML models for forecasting:

- **Cash Flow Forecasting**: Predict income/expenses for next 6 months
- **Net Worth Projection**: Monte Carlo simulation for retirement planning
- **Goal Completion Probability**: Likelihood of meeting financial goals
- **Emergency Fund Adequacy**: Predict months of runway based on spending patterns

### 4. **Portfolio Analytics**

Deep investment analysis:

- **XIRR/CAGR Calculation**: Accurate returns accounting for cash flows
- **Risk Metrics**: Sharpe ratio, max drawdown, volatility
- **Asset Allocation Analysis**: Current vs target allocation
- **Rebalancing Suggestions**: Specific buy/sell recommendations

---

## Architecture

### AI Model Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Natural Language Query                   │
│  "How much did I spend on food last month?"                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Intent Classification (ONNX)                   │
│  Intent: spending_query | Entities: {category: food}        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              RAG Context Retrieval (ChromaDB)               │
│  Fetch: food transaction history, category mappings         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Prompt Generation (Template-based)             │
│  Context: [food transactions] + Query                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Phi-3 LLM (ONNX, Local Inference)              │
│  Generate: "You spent ₹12,450 on food..."                   │
└─────────────────────────────────────────────────────────────┘
```

### Event-Driven Analytics

```
┌─────────────────────────────────────────────────────────────┐
│           Wealth Management Service                         │
│  Creates transaction: "Zomato - ₹850"                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                  Publishes Event
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           Redis Stream: WEALTH_TRANSACTION_CREATED          │
│  {transactionId, category, amount, merchant}                │
└────────────────────────┬────────────────────────────────────┘
                         │
                   Consumes Event
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           Wealth Analyzer (Analytics Pipeline)              │
│  1. Update spending trends                                  │
│  2. Check for anomalies (if amount > threshold)             │
│  3. Update category embeddings (ChromaDB)                   │
│  4. Trigger daily insights if threshold reached             │
└─────────────────────────────────────────────────────────────┘
```

---

## AI Models

### 1. **Phi-3 Mini (3.8B Parameters)**

**Purpose**: Natural language understanding and generation

**Model**: `microsoft/Phi-3-mini-4k-instruct`  
**Deployment**: ONNX Runtime with CUDA/TensorRT  
**Context Window**: 4K tokens  
**Quantization**: 4-bit GGUF for fast inference  
**Inference Time**: <500ms on RTX 3060

**Fine-Tuning**: Export models to ONNX for NestJS inference. See [INFERENCE_PIPELINE.md](../../docs/ml/INFERENCE_PIPELINE.md).

### 2. **Isolation Forest (Anomaly Detection)**

**Purpose**: Detect unusual transactions

**Framework**: Scikit-learn → ONNX  
**Features**: `[amount, day_of_week, hour_of_day, merchant_frequency, category_avg_amount]`  
**Threshold**: Anomaly score < -0.5  
**Inference Time**: <10ms per transaction

### 3. **XGBoost (Cash Flow Forecasting)**

**Purpose**: Predict income/expenses for next 6 months

**Framework**: XGBoost → ONNX  
**Features**: `[month, category, rolling_3m_avg, seasonal_pattern, trend]`  
**Accuracy**: MAE < 15% for recurring expenses  
**Inference Time**: <50ms for 6-month forecast

### 4. **ChromaDB (Vector Store for RAG)**

**Purpose**: Store embeddings for semantic search

**Embedding Model**: `all-MiniLM-L6-v2` (384 dimensions)  
**Collections**: `transactions`, `merchant_names`, `user_queries`

---

## Development

### Prerequisites

- Node.js 20+
- NVIDIA GPU (RTX 3060 or better) with CUDA 12.1
- MongoDB 7+
- Redis 7+
- QuestDB 8+
- Python 3.10+ (for model training)

### Installation

```bash
pnpm install

# Download Phi-3 model
mkdir -p models
cd models
wget https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf
```

### Running

```bash
# Development
pnpm run start:dev

# Production
pnpm run build
pnpm run start:prod
```

---

## References

- [ML Architecture](../../docs/ml/README.md)
- [INFERENCE_PIPELINE.md](../../docs/ml/INFERENCE_PIPELINE.md) - ONNX inference patterns
- [Phi-3 Documentation](https://huggingface.co/microsoft/Phi-3-mini-4k-instruct)

**Status**: Active Development  
**Port**: 3007 (HTTP), 50055 (gRPC)  
**Last Updated**: March 17, 2026
