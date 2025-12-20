import { Module } from '@nestjs/common';
import { HistoricalDataService } from './historical-data.service';
import { HistoricalDataController } from './historical-data.controller';
import { HistoricalDataScheduler } from './historical-data.scheduler';

@Module({
  controllers: [HistoricalDataController],
  providers: [HistoricalDataService, HistoricalDataScheduler],
  exports: [HistoricalDataService],
})
export class HistoricalDataModule {}
