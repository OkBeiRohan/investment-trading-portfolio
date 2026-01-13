import { Module } from '@nestjs/common';
import { SimpleUpstoxClient } from '@repo/market-sdk';
import { HistoricalDataBootstrapService } from './historical-data.service';
import { HistoricalDataController } from './historical-data.controller';

@Module({
  controllers: [HistoricalDataController],
  providers: [HistoricalDataBootstrapService, SimpleUpstoxClient],
  exports: [HistoricalDataBootstrapService],
})
export class HistoricalDataModule {}
