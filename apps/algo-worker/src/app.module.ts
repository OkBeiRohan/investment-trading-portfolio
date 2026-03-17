import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongoDBModule, RedisModule } from '@repo/database';
import { AuthModule } from '@repo/authentication';
import { UpstoxModule } from '@repo/market-sdk';
import { ObservabilityModule as GlobalObservabilityModule } from '@repo/observability';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PredictionModule } from './layers/prediction/prediction.module';
import { StrategyRiskModule } from './layers/strategy-risk/strategy-risk.module';
import { ExecutionModule } from './layers/execution/execution.module';
import { ObservabilityModule as LocalObservabilityModule } from './layers/observability/observability.module';
import registerConfiguration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [registerConfiguration],
      envFilePath: ['.env.local', '.env'],
    }),
    EventEmitterModule.forRoot(),
    MongoDBModule,
    RedisModule,
    AuthModule,
    UpstoxModule,
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
