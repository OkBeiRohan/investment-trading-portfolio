# Quick Start Guide - Algo Worker

## 🚀 Getting Started (Development)

### Prerequisites

```bash
# Node.js 20+
node --version  # v20.x.x

# Python 3.13+ (for model training)
python --version  # 3.13.5

# MongoDB
mongod --version  # 7.x

# CUDA (optional, for GPU)
nvidia-smi  # CUDA 13.0
```

### Installation

```bash
# 1. Install dependencies (from monorepo root)
cd /home/anandhu/Code/investment-trading-portfolio
pnpm install

# 2. Set up environment
cd apps/algo-worker
cp .env.example .env
# Edit .env with your Upstox API credentials

# 3. Start MongoDB
mongod --dbpath ./data/db

# 4. Build shared packages
cd ../..
pnpm build --filter=@repo/schema
pnpm build --filter=@repo/database
pnpm build --filter=@repo/market-sdk

# 5. Start algo-worker
cd apps/algo-worker
pnpm dev
```

---

## 📁 Project Navigation

### Key Files to Know

```bash
# Main entry point
src/main.ts

# App module (all engines imported here)
src/app.module.ts

# Orchestrator (complete pipeline)
src/trading-orchestrator.service.ts

# Configuration
src/config/trading.config.ts
.env

# Engines
src/engines/data/         # Market data & features
src/engines/signal/       # ML inference
src/engines/policy/       # Strategy & risk
src/engines/execution/    # Orders & positions

# Documentation
ARCHITECTURE.md           # System design
IMPLEMENTATION_SUMMARY.md # What's built
PROJECT_STRUCTURE.md      # File tree
```

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov

# Watch mode
pnpm test:watch
```

### Write Tests

```typescript
// Example: src/engines/signal/signal-engine.service.spec.ts
describe('SignalEngineService', () => {
  let service: SignalEngineService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [SignalEngineService, ModelLoaderService],
    }).compile();

    service = module.get<SignalEngineService>(SignalEngineService);
  });

  it('should generate signal from features', async () => {
    const features = {
      /* mock features */
    };
    const signal = await service.generateSignal(features, 'user123');

    expect(signal.prediction).toMatch(/VOL_UP|VOL_DOWN|NEUTRAL/);
    expect(signal.confidence).toBeGreaterThanOrEqual(0);
    expect(signal.confidence).toBeLessThanOrEqual(1);
  });
});
```

---

## 🔧 Common Tasks

### 1. Add New Feature to FeatureEngineering

```typescript
// src/engines/data/feature-engineering.service.ts

async calculateNewFeature(data: MarketData[]): Promise<number> {
  // Your calculation logic
  return result;
}

// Update engineerFeatures() to include new feature
async engineerFeatures(...): Promise<Features> {
  return {
    // ...existing features
    newFeature: await this.calculateNewFeature(data),
  };
}
```

Don't forget to update schema:

```typescript
// packages/schema/src/trading/feature.schema.ts
export const featuresSchema = z.object({
  // ...existing
  newFeature: z.number().optional(),
});
```

### 2. Add New Strategy

```typescript
// src/engines/policy/strategy-selection.service.ts

private readonly STRATEGY_MATRIX = {
  VOL_UP: {
    // Add new confidence band
    veryHighConfidence: {
      name: 'NEW_STRATEGY',
      minConfidence: 0.8,
      maxConfidence: 1.0,
      description: 'Your strategy description',
    },
  },
};
```

Update enum:

```typescript
// packages/schema/src/trading/enums.ts
export const StrategyTypeEnum = z.enum([
  // ...existing
  'NEW_STRATEGY',
]);
```

### 3. Modify Risk Limits

```bash
# .env file
MAX_DAILY_LOSS=-100000  # Change from -50000
MAX_POSITIONS=10        # Change from 5
```

Or programmatically:

```typescript
// src/config/trading.config.ts
risk: {
  maxDailyLoss: parseInt(process.env.MAX_DAILY_LOSS || '-100000'),
}
```

### 4. Add New ML Model

```typescript
// src/engines/signal/model-loader.service.ts

async onModuleInit() {
  await Promise.all([
    // ...existing models
    this.loadModel('new_model', modelPath, '1.0.0'),
  ]);
}

// src/engines/signal/signal-engine.service.ts
private async getL0Predictions(features: Features) {
  const [xgboost, cnnLstm, ginn, svm, newModel] = await Promise.all([
    // ...existing
    this.runModel('new_model', inputTensor),
  ]);

  return {
    // ...existing
    newModel,
  };
}
```

Update schema:

```typescript
// packages/schema/src/trading/signal.schema.ts
export const modelContributionsSchema = z.object({
  // ...existing
  newModel: z.number(),
});
```

---

## 🐛 Debugging

### Enable Debug Logging

```bash
# .env
LOG_LEVEL=debug
```

```typescript
// In any service
this.logger.debug('Detailed debug info', { data });
```

### Check Errors

```bash
# View NestJS logs
pnpm dev

# MongoDB logs
tail -f /var/log/mongodb/mongod.log

# Check GPU usage
nvidia-smi -l 1
```

### Common Issues

**Issue**: `Cannot find module '@repo/schema'`
**Solution**: Build shared packages first

```bash
pnpm build --filter=@repo/schema
```

**Issue**: ONNX model not found
**Solution**: Place models in correct path

```bash
mkdir -p models/
# Copy your .onnx files to models/
ls models/  # Should show xgboost.onnx, etc.
```

**Issue**: MongoDB connection failed
**Solution**: Check MongoDB is running

```bash
mongosh  # Should connect successfully
```

**Issue**: Upstox API error
**Solution**: Verify credentials in .env

```bash
echo $UPSTOX_API_KEY
echo $UPSTOX_API_SECRET
```

---

## 📊 Monitoring

### Check System Health

```bash
# HTTP endpoint (to be implemented)
curl http://localhost:3001/health

# Expected response:
{
  "status": "ok",
  "engines": {
    "dataEngine": true,
    "signalEngine": true,
    "policyEngine": true,
    "executionEngine": true
  }
}
```

### View Recent Signals

```bash
# MongoDB query
mongosh trading
db.tradingSignals.find().sort({timestamp: -1}).limit(10)
```

### Check Open Positions

```bash
db.positions.find({status: 'OPEN'})
```

### Performance Metrics

```bash
db.performanceMetrics.find().sort({startDate: -1}).limit(1)
```

---

## 🎯 ML Model Training Workflow

### 1. Export Training Data

```typescript
// In any controller or scheduled job
@Get('export-training-data')
async exportTrainingData() {
  await this.trainingDataService.exportLabeledToCSV('NIFTY50');
  return { success: true, path: './data/exports/features_labeled.csv' };
}
```

### 2. Train Models (Python)

```bash
cd data/exports

# Create training script
cat > train.py << 'EOF'
import pandas as pd
import xgboost as xgb
import pickle

# Load data
df = pd.read_csv('features_labeled.csv')
X = df.drop('label', axis=1)
y = df['label']

# Train XGBoost
model = xgb.XGBClassifier(
    max_depth=6,
    learning_rate=0.01,
    n_estimators=100
)
model.fit(X, y)

# Save as ONNX
model.save_model('../../models/xgboost.onnx')
EOF

# Run training
python train.py
```

### 3. Load and Test

```typescript
// Test inference
const signal = await this.signalEngine.generateSignal(features, userId);
console.log(signal); // Should show predictions
```

---

## 🚢 Deployment

### Docker Build

```bash
# Create Dockerfile (if not exists)
cat > Dockerfile << 'EOF'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["node", "dist/main.js"]
EOF

# Build image
docker build -t algo-worker .

# Run container
docker run -d \
  --name algo-worker \
  -p 3001:3001 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017 \
  -e UPSTOX_API_KEY=your_key \
  -e UPSTOX_API_SECRET=your_secret \
  --gpus all \
  algo-worker
```

### Production Checklist

- [ ] Environment variables configured
- [ ] MongoDB connection secured
- [ ] Upstox API credentials valid
- [ ] ONNX models present in `models/`
- [ ] Risk limits reviewed
- [ ] Backtesting completed
- [ ] Monitoring enabled
- [ ] Logging configured
- [ ] Error alerts set up
- [ ] Paper trading tested

---

## 📚 Learning Path

### 1. Understand the Architecture

Read in order:

1. `ARCHITECTURE.md` - System design overview
2. `IMPLEMENTATION_SUMMARY.md` - What's been built
3. `PROJECT_STRUCTURE.md` - File organization
4. `.github/copilot-instructions.md` - Design principles

### 2. Explore the Code

Start with:

1. `src/app.module.ts` - See how everything connects
2. `src/trading-orchestrator.service.ts` - Understand the pipeline
3. `src/engines/data/feature-engineering.service.ts` - Feature calculations
4. `src/engines/signal/signal-engine.service.ts` - ML inference

### 3. Study the Schemas

```bash
cd packages/schema/src/trading
ls -l  # See all schema files
cat enums.ts  # All trading enums
cat signal.schema.ts  # Signal structure
```

### 4. Run Examples

```typescript
// Create test controller for experimentation
@Controller('test')
export class TestController {
  constructor(private readonly orchestrator: TradingOrchestrator) {}

  @Get('run-cycle')
  async runTestCycle() {
    await this.orchestrator.executeTradingCycle('test-user');
    return { success: true };
  }
}
```

---

## 🆘 Getting Help

### Documentation

- Architecture questions → `ARCHITECTURE.md`
- Implementation details → `IMPLEMENTATION_SUMMARY.md`
- File structure → `PROJECT_STRUCTURE.md`
- This guide → `QUICK_START.md`

### Code Comments

All services have detailed JSDoc comments:

```typescript
/**
 * Calculate RSI (Relative Strength Index)
 * @param prices - Array of closing prices
 * @param period - RSI period (default: 14)
 * @returns RSI value (0-100)
 */
```

### Logs

Check console output for detailed execution flow:

```
[DataCollectionService] Fetching historical data...
[FeatureEngineeringService] Engineering features...
[SignalEngineService] Generating signal...
[StrategySelectionService] Selected strategy: LONG_STRADDLE
[OrderPlacementService] Order placed: ORD_1234567890
```

---

## 🎓 Best Practices

### 1. Always Use Types from @repo/schema

```typescript
// ✅ Good
import { TradingSignal } from '@repo/schema';

// ❌ Bad
interface TradingSignal {
  /* local definition */
}
```

### 2. Handle Errors Properly

```typescript
try {
  const result = await service.doSomething();
} catch (error) {
  this.logger.error('Operation failed', error);
  throw new InternalServerErrorException('Friendly message');
}
```

### 3. Log Important Events

```typescript
this.logger.log('Signal generated', { prediction, confidence });
this.logger.warn('Risk limit approaching', { currentRisk });
this.logger.error('Order failed', { orderId, reason });
```

### 4. Validate Inputs

```typescript
// Use Zod schemas
const validated = tradingSignalSchema.parse(input);

// Or NestJS validators
@IsNumber()
@Min(0)
@Max(1)
confidence: number;
```

### 5. Write Tests First (TDD)

```typescript
// Write test
it('should calculate RSI correctly', () => {
  expect(service.calculateRSI(prices, 14)).toBeCloseTo(65.5, 1);
});

// Then implement
calculateRSI(prices: number[], period: number): number {
  // Implementation
}
```

---

## 🔗 Useful Commands

```bash
# Development
pnpm dev                  # Start in watch mode
pnpm build                # Build for production
pnpm start                # Start production build

# Testing
pnpm test                 # Run unit tests
pnpm test:watch           # Watch mode
pnpm test:cov             # Coverage report
pnpm test:e2e             # Integration tests

# Code Quality
pnpm lint                 # Run ESLint
pnpm format               # Format with Prettier
pnpm typecheck            # Check TypeScript

# Database
mongosh trading           # Connect to DB
db.tradingSignals.find()  # Query signals
db.positions.find()       # Query positions

# Monitoring
nvidia-smi                # Check GPU
htop                      # System resources
pnpm logs                 # View logs
```

---

## ✅ Next Steps After Setup

1. [ ] Read `ARCHITECTURE.md` thoroughly
2. [ ] Explore each engine's services
3. [ ] Set up your .env file
4. [ ] Run `pnpm dev` and verify startup
5. [ ] Implement @repo/database (next phase)
6. [ ] Implement @repo/market-sdk (next phase)
7. [ ] Train your first ML model
8. [ ] Run a backtest
9. [ ] Deploy to staging
10. [ ] Go live with paper trading

---

**Happy Trading! 📈🚀**
