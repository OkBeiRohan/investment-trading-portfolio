# GitHub Copilot Instructions - Project Quantum

## Project Overview

**Project Quantum** is an institutional-grade algorithmic trading platform for the Indian market. It uses a **7-Layer Cognitive Architecture** integrating Transformers, Reinforcement Learning, and Neuro-Symbolic AI.

**Monorepo Structure**:
- `apps/`: Deployable applications (algo-worker, web, api).
- `packages/`: Shared libraries (ai-models, database, market-sdk).

## Core Principles

### 1. "Quantum" Architecture Standards

- **Neuro-Symbolic Design**: Combine ML predictions (Neuro) with hard risk constraints (Symbolic). Never execute an ML action without passing it through the `RiskManager`.
- **Event-Driven**: Use `Redis Streams` or `EventEmitter` for inter-service communication. Avoid direct synchronous coupling between engines.
- **Latency Aware**: Optimize hot paths (Signal -> Execution) for sub-millisecond latency. Use `TypedArray` or `Buffer` for large numerical data.

### 2. AI & Machine Learning Guidelines

- **Strict Tensor Typing**: When working with ML models, ALWAYS define input/output shapes and types.
    ```typescript
    // ✅ CORRECT
    type ModelInput = Float32Array; // Shape: [Batch, Sequence, Features]
    interface Prediction {
      probabilities: Float32Array; // Shape: [Batch, Classes]
      confidence: number;
    }
    ```
- **ONNX Runtime**: Use `onnxruntime-node` for inference. Do not use Python bridges for production inference unless absolutely necessary.
- **Model Versioning**: Load models from a versioned registry (e.g., `models/v1.2.0/tft.onnx`).

### 3. Shared Package Architecture

- **@repo/ai-models**: ALL model definitions, pre-processing logic, and inference wrappers go here.
- **@repo/database**: ALL database interactions. No direct DB calls in apps.
- **@repo/market-sdk**: ALL external API interactions.

### 4. Code Quality & Safety

- **No `any`**: Use `unknown` if necessary, but prefer strict Zod schemas.
- **Error Handling**: Use custom error classes (e.g., `ModelInferenceError`, `RiskLimitExceededError`).
- **Logging**: Structured JSON logging with trace IDs is mandatory for all transactions.

## Development Workflow

1.  **Plan**: Check `implementation_plan.md` and `docs/ARCHITECTURE.md`.
2.  **Define**: Create Zod schemas in `@repo/schema`.
3.  **Implement**: Write code in `apps/` or `packages/`.
4.  **Verify**: Run unit tests and (if applicable) backtests.
5.  **Document**: Update `docs/PROGRESS.md` and `README.md`.

## Specific Package Rules

### @repo/ai-models
- Implement `ModelInterface` for all models (load, predict, unload).
- Include `preprocessing` and `postprocessing` methods within the model class.
- Use `GPU` execution provider if available.

### @repo/market-sdk
- Handle rate limits gracefully with exponential backoff.
- Normalize data from different providers (Upstox, Binance) into a common `MarketData` format.

## Common Anti-Patterns

❌ Hardcoding model paths.
❌ Performing heavy tensor math in the main Node.js event loop (use worker threads or ONNX).
❌ Ignoring `RiskManager` validation results.
❌ Mixing business logic with data access code.

## Getting Help

- **Architecture**: See `docs/ARCHITECTURE.md` in `apps/algo-worker`.
- **AI Research**: Refer to the "Research & References" section in the root README.
- **Agents**: Consult `.github/agents/` for role-specific guidelines.
