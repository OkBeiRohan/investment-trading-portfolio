import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Import database modules
import { MongoDBModule, QuestDBModule, RedisModule } from '@repo/database';

// Import all 4 engines
import { DataEngineModule } from './engines/data/data-engine.module';
import { SignalEngineModule } from './engines/signal/signal-engine.module';
import { PolicyEngineModule } from './engines/policy/policy-engine.module';
import { ExecutionEngineModule } from './engines/execution/execution-engine.module';

// Import health and models modules
import { HealthModule } from './health/health.module';
import { ModelsModule } from './models/model.module';

// Import orchestrator
import { TradingOrchestrator } from './trading-orchestrator.service';

// Import trading config
import tradingConfig from './config/trading.config';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [tradingConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Database connections
    MongoDBModule,
    QuestDBModule,
    RedisModule,

    // 4-Engine Architecture
    DataEngineModule,
    SignalEngineModule,
    PolicyEngineModule,
    ExecutionEngineModule,

    // Health monitoring & Model management
    HealthModule,
    ModelsModule,
  ],
  controllers: [AppController],
  providers: [AppService, TradingOrchestrator],
})
export class AppModule {}
