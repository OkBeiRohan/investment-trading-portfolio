import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TestController } from './test.controller';

// Import database module
import { TradingDatabaseModule } from '@repo/database';

// Import all 4 engines
import { DataEngineModule } from './engines/data/data-engine.module';
import { SignalEngineModule } from './engines/signal/signal-engine.module';
import { PolicyEngineModule } from './engines/policy/policy-engine.module';
import { ExecutionEngineModule } from './engines/execution/execution-engine.module';

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

    // Database connection (MongoDB)
    TradingDatabaseModule,

    // 4-Engine Architecture
    DataEngineModule,
    SignalEngineModule,
    PolicyEngineModule,
    ExecutionEngineModule,
  ],
  controllers: [AppController, TestController],
  providers: [AppService, TradingOrchestrator],
})
export class AppModule {}
