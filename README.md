# Investment Trading Portfolio - Project Quantum

> **Institutional-grade algorithmic trading platform for the Indian Market (Nifty 50, Bank Nifty).**
> Powered by "Quantum Core" - A 7-Layer Cognitive Architecture integrating Transformers, Reinforcement Learning, and Neuro-Symbolic AI.

---

## 🚀 Overview

**Project Quantum** represents the next evolution in algorithmic trading systems. It moves beyond traditional ensemble methods to a **Hybrid Neuro-Symbolic** approach, combining the pattern-matching power of Deep Learning (Transformers, CNN-LSTM) with the strategic adaptability of Reinforcement Learning (RL) and the logical rigor of symbolic risk management.

### Key Capabilities

- **🧠 Cognitive AI Core**:
    - **Temporal Fusion Transformers (TFT)** for multi-horizon price forecasting.
    - **FinBERT-India** for real-time sentiment analysis of Indian financial news.
    - **Deep Q-Network (DQN)** agents for dynamic portfolio allocation.
- **⚡ Ultra-Low Latency Execution**:
    - Event-driven architecture using **NestJS** and **Redis Streams**.
    - Smart Order Routing (SOR) with TWAP/VWAP execution algorithms.
- **🛡️ Institutional Risk Management**:
    - Real-time Greeks monitoring (Delta, Gamma, Vega, Theta).
    - Kelly Criterion position sizing with dynamic leverage control.
    - "Circuit Breaker" modules for extreme volatility protection.
- **📊 Comprehensive Dashboard**:
    - Real-time visualization of AI confidence, sentiment analysis, and P&L.
    - Full transparency into model decision-making (Explainable AI).

---

## 🏗️ The Quantum Architecture

The system is built on a **7-Layer Cognitive Architecture**:

```mermaid
graph TD
    subgraph "Layer 1: Perception"
        MD[Market Data Feed] -->|Ticks/Quotes| MF[Market Feeder]
        News[News/Twitter] -->|Text| MF
    end

    subgraph "Layer 2: Cortex"
        MF -->|Stream| FE[Feature Engine]
        FE -->|Tech Indicators| QDB[(QuestDB)]
        FE -->|Sentiment| FB[FinBERT Model]
    end

    subgraph "Layer 3: Prediction"
        QDB --> TFT[Temporal Fusion Transformer]
        QDB --> ENS[Ensemble Models]
        FB --> ENS
    end

    subgraph "Layer 4: Cognition"
        TFT -->|Forecast| RL[RL Agent (DQN)]
        ENS -->|Signal| RL
        RL -->|Action| RM[Risk Manager]
    end

    subgraph "Layer 5: Execution"
        RM -->|Validated Order| EXE[Execution Engine]
        EXE -->|FIX/API| Broker[Upstox/Binance]
    end

    subgraph "Layer 6: Memory"
        Redis[(Redis State)]
        Mongo[(MongoDB Logs)]
    end

    subgraph "Layer 7: Control"
        MLOps[MLflow Tracking]
        Dash[Grafana/Web UI]
    end
```

### Tech Stack

- **Languages**: TypeScript (Core), Python (ML Training)
- **Frameworks**: NestJS (Backend), Next.js (Frontend), PyTorch (AI Models)
- **Databases**:
    - **QuestDB**: High-performance time-series storage.
    - **MongoDB**: Document storage for orders, signals, and logs.
    - **Redis**: In-memory state, caching, and pub/sub.
- **AI/ML**: ONNX Runtime, Hugging Face Transformers, Stable Baselines3.

---

## 📚 Documentation

### Core Guides
- **[Implementation Plan](implementation_plan.md)**: Roadmap for the Quantum upgrade.
- **[Copilot Instructions](.github/copilot-instructions.md)**: Coding standards and AI guidelines.

### Component Docs
- **[Algo Worker](apps/algo-worker/README.md)**: The trading engine core.
- **[Market SDK](packages/market-sdk/README.md)**: Unified market data interface.
- **[Database](packages/database/README.md)**: Data access layer.

---

## 🔬 Research & References

This project is grounded in cutting-edge research:

1.  **Transformers in Finance**: *Lim et al. (2021)* - "Temporal Fusion Transformers for Interpretable Multi-horizon Time Series Forecasting".
2.  **Sentiment Analysis**: *Araci (2019)* - "FinBERT: Financial Sentiment Analysis with Pre-trained Language Models".
3.  **Reinforcement Learning**: *Hambly et al. (2023)* - "Reinforcement Learning in Finance: A Survey".
4.  **Hybrid Models**: *Zhang et al. (2023)* - "A Hybrid CNN-LSTM Model for Stock Price Prediction".

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 20+
- Python 3.10+
- Docker & Docker Compose
- CUDA-enabled GPU (Recommended for training)

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>

# 2. Install dependencies
pnpm install

# 3. Start infrastructure
docker-compose up -d

# 4. Run development mode
pnpm dev
```

---

## 🤝 Contributing

Please read the **[Copilot Instructions](.github/copilot-instructions.md)** before contributing. We enforce strict TypeScript, comprehensive testing, and "Quantum" architectural standards.

---

**Built with ❤️ for the Indian Algo Trading Community**
