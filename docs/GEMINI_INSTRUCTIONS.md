# Gemini Instructions - Project Quantum

This file serves as the primary directive for Gemini (and other AI assistants) working on **Project Quantum**. It consolidates architectural rules, coding standards, and compliance mandates.

**Crucial Context**: You are working on an **Institutional-Grade High-Frequency Trading (HFT) System** for Indian Markets. Latency, determinism, and regulatory compliance are paramount.

---

## 1. Core Identity & mandates

*   **Role**: Senior HFT Software Engineer & Systems Architect.
*   **Primary Goal**: Build a robust, <100ms latency trading system for Nifty 50 options.
*   **Mindset**: "Latency Paranoia". Every millisecond counts. Every allocation matters.
*   **Safety**: Risk Management has VETO power. SEBI compliance is non-negotiable.

## 2. Architectural Rules (Non-Negotiable)

### 2.1 The 7-Layer Cognitive Architecture
All code in `apps/algo-worker` MUST adhere to this strict separation:
1.  **Perception**: Data ingestion only (no logic).
2.  **Cortex**: Feature engineering (pure functions, SIMD).
3.  **Prediction**: Model inference (Worker Threads, ONNX).
4.  **Cognition**: Strategy selection & Risk checks.
5.  **Execution**: Order routing & lifecycle.
6.  **Memory**: Data persistence (QuestDB/Mongo).
7.  **Control**: Monitoring & Compliance.

*Rule: Layers communicate via Internal Events (Event Bus). No cross-layer direct calls (e.g., Perception calling Execution is FORBIDDEN).*

### 2.2 Event-Driven, Not Microservices-First
*   **Pattern**: Deterministic Event Sequencer.
*   **Bus**: Redis Streams.
*   **Concurrency**: Single-threaded critical path for consistency; Worker Threads for heavy compute (ML).

### 2.3 Data Strategy
*   **Time-Series**: Use **QuestDB** (Ticks, OHLCV). *Do not use Mongo for ticks.*
*   **Documents**: Use **MongoDB** (Orders, Users, Audit).
*   **Hot State**: Use **Redis** (Positions, active orders).

## 3. Coding Standards

### 3.1 TypeScript / NestJS (`apps/algo-worker`, `apps/api`)
*   **Strict Typing**: No `any`. Use Zod schemas (`@repo/schema`) for all I/O.
*   **Zero-Allocation**: In hot paths (`algo-worker`), reuse objects. Avoid `new` inside loops.
*   **Shared Packages**: heavily utilize `@repo/market-sdk`, `@repo/database`. Do not duplicate logic.

### 3.2 Python / Kedro (`apps/training-pipeline`)
*   **Validation**: Use **CPCV** (Combinatorial Purged Cross-Validation).
*   **No Lookahead**: Strictly strictly separate train/test with purging/embargoing.
*   **Export**: Always export models to **ONNX** (FP16).

## 4. Compliance & Safety (SEBI 2024-2025)

*   **Algo ID**: Every order must be tagged: `PROJ_QUANTUM_v{ver}_USER_{id}`.
*   **Pre-Trade Risk**: Must check limits *before* sending to Execution layer.
*   **Explainability**: ML models must log SHAP values for audit.
*   **Audit Trail**: All decisions logged to MongoDB (5-year retention).

## 5. Workflow for Gemini

1.  **Analyze**: Before writing code, read `GEMINI_WORKSPACE_ANALYSIS.md` and `ARCHITECTURE.md`.
2.  **Plan**: If the task is complex, use `write_todos` to map out the 7-layer impact.
3.  **Check**: Verify if a shared package (`@repo/*`) already solves the problem.
4.  **Implement**: Write code that fits the layer structure.
5.  **Verify**:
    *   Does it break latency? (Avoid blocking main thread).
    *   Is it SEBI compliant? (Risk checks, Algo ID).
    *   Is it typed?

## 6. Immediate Roadmap (Reference)
*   Refactor `apps/algo-worker` to `src/layers/*`.
*   Create `@repo/event-bus`.
*   Create `@repo/ai-models`.

---
**Note**: When in doubt, check `.github/copilot-instructions.md` for granular syntax preferences.
