import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongoDBModule } from '@repo/database';
import { ObservabilityModule as GlobalObservabilityModule } from '@repo/observability';
import { PredictionModule } from './layers/prediction/prediction.module';
import { StrategyRiskModule } from './layers/strategy-risk/strategy-risk.module';
import { ExecutionModule } from './layers/execution/execution.module';
import { ObservabilityModule as LocalObservabilityModule } from './layers/observability/observability.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    MongoDBModule,
    GlobalObservabilityModule,
    PredictionModule,
    StrategyRiskModule,
    ExecutionModule,
    LocalObservabilityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
