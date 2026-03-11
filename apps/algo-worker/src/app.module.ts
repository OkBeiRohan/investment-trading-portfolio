import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PredictionModule } from './layers/prediction/prediction.module';
import { StrategyRiskModule } from './layers/strategy-risk/strategy-risk.module';
import { ExecutionModule } from './layers/execution/execution.module';
import { ObservabilityModule } from './layers/observability/observability.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PredictionModule,
    StrategyRiskModule,
    ExecutionModule,
    ObservabilityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
