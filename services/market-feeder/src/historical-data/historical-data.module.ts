import { Module } from '@nestjs/common';
import { HistoricalDataService } from './historical-data.service';
import { HistoricalDataController } from './historical-data.controller';

@Module({
  controllers: [HistoricalDataController],
  providers: [HistoricalDataService],
  exports: [HistoricalDataService],
})
export class HistoricalDataModule {}
