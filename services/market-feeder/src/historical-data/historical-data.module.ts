import { Module } from '@nestjs/common';
import { HistoricalDataBootstrapService } from './historical-data.service';
import { HistoricalDataController } from './historical-data.controller';
import { SimpleUpstoxClient } from './simple-client';

@Module({
  controllers: [HistoricalDataController],
  providers: [HistoricalDataBootstrapService, SimpleUpstoxClient],
  exports: [HistoricalDataBootstrapService],
})
export class HistoricalDataModule {}
