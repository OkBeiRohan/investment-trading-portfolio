# Documentation Structure

This folder contains **core architecture and system-wide documentation** for Quantum Investments and Trades.

**Last Updated**: January 18, 2026

---

## 📁 Documentation Organization

### Core Architecture (This Folder)

**System Design**:

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall system architecture and design philosophy
- [ALGO_TRADING_ARCHITECTURE.md](./ALGO_TRADING_ARCHITECTURE.md) - Complete 9-layer algo trading system design
- [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md) - Hybrid local-cloud deployment strategy
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Development workflow, setup, and best practices
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Implementation roadmap and gap analysis
- [SECURITY.md](./SECURITY.md) - Security policies and best practices

**AI/ML Architecture (2026 State-of-the-Art)**:

> 📁 **NEW**: See [ml/README.md](./ml/README.md) for comprehensive AI documentation with code examples.

- [ml/AI_TRADING_ARCHITECTURE.md](./ml/AI_TRADING_ARCHITECTURE.md) - 4-tier hierarchical model architecture
- [ml/TIER1_MODELS.md](./ml/TIER1_MODELS.md) - TFT, Mamba, PatchTST, LiT with full code
- [ml/META_LEARNER_EXECUTION.md](./ml/META_LEARNER_EXECUTION.md) - Signal fusion, PPO execution agent
- [ml/TRAINING_PIPELINE.md](./ml/TRAINING_PIPELINE.md) - CPCV validation, Kedro orchestration
- [ml/FEATURE_STORE.md](./ml/FEATURE_STORE.md) - Feast + Redis for consistency

**Legacy AI Docs** (Reference Only):

- [HIERARCHICAL_INTELLIGENCE_ARCHITECTURE.md](./HIERARCHICAL_INTELLIGENCE_ARCHITECTURE.md) - Original ML model hierarchy
- [MODEL_INVENTORY.md](./MODEL_INVENTORY.md) - Model taxonomy
- [MARKET_STATE_ENCODER.md](./MARKET_STATE_ENCODER.md) - Feature engineering concepts
- [FEATURE_STORE_ARCHITECTURE.md](./FEATURE_STORE_ARCHITECTURE.md) - Original feature registry design
- [AI_MODEL_TRAINING.md](./AI_MODEL_TRAINING.md) - Original training pipelines

**Research & Advanced**:

- [RESEARCH_FINDINGS.md](./RESEARCH_FINDINGS.md) - Research insights and benchmarks
- [AGENTIC_AI_RESEARCH.md](./AGENTIC_AI_RESEARCH.md) - Multi-agent systems (R&D only, not production)

---

### App-Specific Documentation

**Apps**:

- [apps/api/docs/](../apps/api/docs/) - API backend documentation
  - `TRPC_ARCHITECTURE.md` - tRPC router patterns
  - `NESTJS_CONFIG_PATTERN.md` - NestJS configuration guide
- [apps/algo-worker/docs/](../apps/algo-worker/docs/) - Trading engine documentation
  - `ARCHITECTURE.md` - 7-layer cognitive architecture
  - `PERFORMANCE_OPTIMIZATION.md` - Zero-allocation patterns, worker threads
  - `QUESTDB_UPSTOX_INTEGRATION.md` - Market data integration
  - `layers/` - Layer-specific implementation guides
- [apps/web/docs/](../apps/web/docs/) - Web dashboard documentation
  - `AUTHENTICATION.md` - Auth state management
  - `DATA_ACCESS_LAYER.md` - Data fetching patterns

**Services**:

- [services/training-pipeline/docs/](../services/training-pipeline/docs/) - ML training documentation
  - `ADVANCED_VALIDATION.md` - CPCV, OFI, walk-forward validation
  - `pipelines/` - Kedro pipeline guides
- [services/wealth-management/docs/](../services/wealth-management/docs/) - Wealth management system
  - `WEALTH_MANAGEMENT_SYSTEM.md` - Double-entry ledger, net worth tracking
- [services/wealth-analyzer/docs/](../services/wealth-analyzer/docs/) - AI insights service
- [services/document-processor/docs/](../services/document-processor/docs/) - Document parsing service

**Packages**:

- [packages/database/docs/](../packages/database/docs/) - Database documentation
  - `MONGODB_REPLICA_SET.md` - MongoDB setup
  - `SQL_QUERY_CENTRALIZATION.md` - QuestDB query patterns
- [packages/market-sdk/docs/](../packages/market-sdk/docs/) - Market data SDK
  - `UPSTOX_OAUTH_INTEGRATION.md` - Upstox authentication
- [packages/authentication/docs/](../packages/authentication/docs/) - Auth package documentation

**Infrastructure**:

- [infrastructure/docs/](../infrastructure/docs/) - Infrastructure documentation
  - `PORT_ALLOCATION.md` - Port mapping for all services
  - `RENDER_DEPLOYMENT.md` - Cloud deployment guide

---

## 🗺️ Documentation Roadmap

### Quick Navigation by Role

**Backend Developer**:

1. [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Start here
2. [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand system design
3. [apps/api/docs/](../apps/api/docs/) - API patterns

**Quant/ML Researcher**:

1. [ml/README.md](./ml/README.md) - 📁 **Start here** - AI documentation index
2. [ml/AI_TRADING_ARCHITECTURE.md](./ml/AI_TRADING_ARCHITECTURE.md) - 4-tier model architecture
3. [ml/TIER1_MODELS.md](./ml/TIER1_MODELS.md) - Model specifications with code
4. [ml/TRAINING_PIPELINE.md](./ml/TRAINING_PIPELINE.md) - CPCV validation, Kedro
5. [services/training-pipeline/docs/](../services/training-pipeline/docs/) - Training infrastructure

**Algo Trader**:

1. [ALGO_TRADING_ARCHITECTURE.md](./ALGO_TRADING_ARCHITECTURE.md) - System design
2. [apps/algo-worker/docs/](../apps/algo-worker/docs/) - Trading engine
3. [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Implementation status

**DevOps Engineer**:

1. [DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md) - Deployment strategy
2. [infrastructure/docs/](../infrastructure/docs/) - Infrastructure setup
3. [SECURITY.md](./SECURITY.md) - Security policies

**Frontend Developer**:

1. [apps/web/docs/](../apps/web/docs/) - Web app patterns
2. [apps/api/docs/TRPC_ARCHITECTURE.md](../apps/api/docs/TRPC_ARCHITECTURE.md) - API integration

---

## 📊 Enhancement Priorities

See [PROJECT_STATUS.md - Gap Analysis](./PROJECT_STATUS.md#gap-analysis-current-vs-next-gen-aft-architecture) for detailed roadmap.

**HIGH ROI (Recommended)**:

1. TBT Feeds + DPDK (100-500ms edge improvement)
2. Feature Store (eliminate training/serving skew)
3. Model CI/CD Pipeline (zero deployment failures)
4. Meta-Learning (10x faster adaptation)

**R&D (Optional Exploration)**:

1. Agentic AI Multi-Agent Systems (post-trade analysis only)
2. Advanced NLP (news sentiment)
3. Graph Neural Networks (sectoral relationships)

---

## 📝 Documentation Standards

### File Naming Convention

- **UPPERCASE_WITH_UNDERSCORES.md** - Architecture/design documents
- **lowercase-with-dashes.md** - Implementation guides
- **PascalCase.md** - Component/module documentation

### Section Structure

All architecture docs should include:

1. **Overview** - Purpose and context
2. **Architecture** - Design and components
3. **Implementation** - Code examples
4. **Monitoring** - Metrics and observability
5. **Testing** - Test strategies
6. **See Also** - Related documents

### Cross-References

Use relative links:

- Same folder: `[ARCHITECTURE.md](./ARCHITECTURE.md)`
- Parent folder: `[README.md](../README.md)`
- App docs: `[algo-worker](../apps/algo-worker/docs/)`

---

## 🔄 Keeping Documentation Updated

### When to Update Docs

- **Architecture changes** → Update relevant architecture docs + PROJECT_STATUS.md
- **New features** → Update app-specific docs + DEVELOPER_GUIDE.md
- **Performance improvements** → Update PERFORMANCE_OPTIMIZATION.md + benchmarks
- **Model changes** → Update MODEL_INVENTORY.md + HIERARCHICAL_INTELLIGENCE_ARCHITECTURE.md

### Review Schedule

- **Weekly**: PROJECT_STATUS.md (implementation progress)
- **Monthly**: Gap analysis section (ROI priorities)
- **Quarterly**: Full architecture review (alignment with latest research)
- **Yearly**: Complete documentation audit

---

## 🤝 Contributing to Documentation

1. **Check existing docs** before creating new ones
2. **Update cross-references** when moving/renaming files
3. **Follow naming conventions** (see above)
4. **Include code examples** with proper syntax highlighting
5. **Add metrics/benchmarks** for performance claims
6. **Mark ROI clearly** (HIGH ROI vs OPTIONAL/R&D)

---

**Questions?** See [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) or create an issue.
