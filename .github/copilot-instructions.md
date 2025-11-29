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
