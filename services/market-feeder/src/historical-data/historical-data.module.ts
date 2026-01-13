import { Module } from '@nestjs/common';
import { HistoricalDataBootstrapService } from './historical-data.service';
import { HistoricalDataController } from './historical-data.controller';

@Module({
  controllers: [HistoricalDataController],
  providers: [HistoricalDataBootstrapService],
  exports: [HistoricalDataBootstrapService],
})
export class HistoricalDataModule {}
