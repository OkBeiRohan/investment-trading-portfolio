import { Module } from '@nestjs/common';
import { HistoricalDataService } from './historical-data.service';
import { HistoricalDataBootstrapService } from './historical-data-bootstrap.service';
import { HistoricalDataController } from './historical-data.controller';

@Module({
  controllers: [HistoricalDataController],
  providers: [HistoricalDataService, HistoricalDataBootstrapService],
  exports: [HistoricalDataService, HistoricalDataBootstrapService],
})
export class HistoricalDataModule {}
