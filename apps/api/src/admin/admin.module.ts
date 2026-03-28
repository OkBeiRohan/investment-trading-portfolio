import { Module } from '@nestjs/common';
import { AdminTradingController } from './admin-trading.controller';
import { AdminInstrumentsController } from './admin-instruments.controller';
import { AdminTrainingController } from './admin-training.controller';
import { MlflowProxyService } from './mlflow-proxy.service';

@Module({
  controllers: [AdminTradingController, AdminInstrumentsController, AdminTrainingController],
  providers: [MlflowProxyService],
})
export class AdminModule {}
