import { Module } from '@nestjs/common';
import { AdminTradingController } from './admin-trading.controller';
import { AdminInstrumentsController } from './admin-instruments.controller';
import { AdminTrainingController } from './admin-training.controller';

@Module({
  controllers: [AdminTradingController, AdminInstrumentsController, AdminTrainingController],
})
export class AdminModule {}
