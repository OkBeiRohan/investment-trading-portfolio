# Gemini Workspace Analysis - Project Quantum

**Date:** 2025-12-04
**Project:** Investment Trading Portfolio (Project Quantum)
**Goal:** Institutional-grade algorithmic trading for Indian Index Options (Nifty 50, Bank Nifty).

## 1. Executive Summary

Project Quantum is a sophisticated, event-driven high-frequency trading (HFT) system designed for the Indian options market. It differentiates itself through a **7-Layer Cognitive Architecture**, rigorous **SEBI 2024-2025 compliance**, and a **hybrid local-cloud deployment** model to minimize latency (<100ms target). The system leverages a neuro-symbolic approach, combining deep learning (ensemble of 8-10 models) with symbolic risk management rules.

## 2. Architectural Pillars

### 2.1. The 7-Layer Cognitive Architecture
The system is strictly organized into seven distinct layers, ensuring separation of concerns and deterministic data flow:

1.  **Perception**: Data Ingestion (Market data via Upstox WebSocket, News via RSS/Twitter). Uses kernel bypass and Protobuf.
2.  **Cortex**: Feature Engineering (SIMD-vectorized technical indicators, real-time Greeks, Sentiment analysis).
3.  **Prediction**: Alpha Generation (ONNX Runtime inference on GPU). Uses an ensemble of XGBoost, LSTM, Transformer, etc.
4.  **Cognition**: Strategy & Risk (Symbolic rules, Strategy Selection, RL agents). **Risk Manager has VETO power.**
5.  **Execution**: Action (Smart Order Routing, TWAP/VWAP, Order Lifecycle Management).
6.  **Memory**: Storage (QuestDB for time-series, MongoDB for docs, Redis for hot state).
7.  **Control**: Observability (Prometheus metrics, Health checks, Circuit breakers, SEBI compliance monitoring).

### 2.2. Event-Driven Core
*   **No Microservices-First**: Prioritizes a **Deterministic Event Sequencer** over HTTP microservices to avoid context-switching latency.
*   **Event Bus**: Redis Streams (primary) for sub-millisecond event propagation.
*   **Data Flow**: `Market Data -> Perception -> Event Bus -> Cortex -> Event Bus -> Prediction -> ... -> Execution`.

### 2.3. Hybrid Deployment
*   **Local Node (`algo-worker`)**: Runs on high-performance hardware (ArchLinux/Windows + RTX GPU) for execution and inference to ensure low latency and data privacy.
*   **Cloud Layer (`apps/web`, `apps/api`)**: Handles UI, configuration, and reporting. Syncs with local node via Redis/MongoDB.

## 3. Key Components & Status

### 3.1. `apps/algo-worker` (The Core)
*   **Role**: The main trading engine.
*   **Status**: Functionally active but requires **refactoring**. Current structure (`engines/`) is tightly coupled. Needs migration to the 7-layer directory structure (`src/layers/perception`, `src/layers/cortex`, etc.).
*   **Tech**: NestJS, TensorRT/ONNX, Redis Streams.

### 3.2. `apps/training-pipeline` (The Brain)
*   **Role**: ML model training and validation.
*   **Methodology**: **Combinatorial Purged Cross-Validation (CPCV)** to prevent lookahead bias. Includes Order Flow Imbalance (OFI) features.
*   **Tech**: Python, Kedro, PyTorch, MLflow.

### 3.3. `@repo/market-sdk` (The Interface)
*   **Role**: Unified interface for market data (Upstox, Yahoo, Binance).
*   **Key Feature**: **WebSocket Multiplexer** with priority-based bin packing to handle connection limits and prioritize critical instruments (ATM options vs. Deep OTM).

### 3.4. Databases
*   **QuestDB**: Primary time-series store (Ticks, OHLCV). Chosen for speed (22x vs ClickHouse for this use case).
*   **MongoDB**: Document store for audit trails, orders, and user data.
*   **Redis**: Hot state cache and Event Bus.

## 4. Strategic Roadmap & Immediate Actions

Based on `PROJECT_STRUCTURE_ANALYSIS.md`, the following actions are critical:

1.  **Package Creation**:
    *   Create `@repo/event-bus`: To standardize event publishing/consuming across the system.
    *   Create `@repo/ai-models`: To provide a shared interface for loading and running ONNX models.
2.  **Refactoring `algo-worker`**:
    *   Migrate from `engines/*` to `layers/*` structure.
    *   Implement the Deterministic Event Sequencer.
3.  **Compliance Integration**:
    *   Ensure every order has a Unique Algo ID (`PROJ_QUANTUM_v{ver}_USER_{id}`).
    *   Implement mandatory pre-trade risk checks and SHAP value logging for explainability.

## 5. Compliance & Safety (SEBI)
*   **Deadline**: Jan 1, 2026.
*   **Mandates**:
    *   **Unique Algo ID**: Strictly formatted.
    *   **Pre-Trade Risk**: Validated before *every* order.
    *   **Audit Trail**: 5-year retention (MongoDB).
    *   **Explainability**: SHAP values for ML decisions.
    *   **Kill Switch**: Auto-shutdown on daily loss > ₹50k or 20% drawdown.

## 6. Tech Stack Summary
*   **Languages**: TypeScript (NestJS/Next.js), Python (Data Science), Rust (planned for critical paths).
*   **Runtime**: Node.js 20+, Python 3.10+.
*   **ML Inference**: ONNX Runtime with TensorRT/OpenVINO execution providers.
*   **Infrastructure**: Docker Compose (current), K8s (planned).

This file serves as the central context for Gemini's operations within this workspace.
