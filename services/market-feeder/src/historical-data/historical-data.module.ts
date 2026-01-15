import { Module } from '@nestjs/common';
import { HistoricalDataBootstrapService } from './historical-data.service';
import { HistoricalDataController } from './historical-data.controller';
import { SimpleUpstoxClient } from './simple-client';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule.register({
      baseURL: 'https://api.upstox.com',
      headers: {
        Authorization: `Bearer ${process.env.UPSTOX_ACCESS_TOKEN}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }),
  ],
  controllers: [HistoricalDataController],
  providers: [HistoricalDataBootstrapService, SimpleUpstoxClient],
  exports: [HistoricalDataBootstrapService],
})
export class HistoricalDataModule {}
