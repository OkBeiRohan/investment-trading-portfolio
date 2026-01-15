import { Module } from '@nestjs/common';
import { HistoricalDataBootstrapService } from './historical-data.service';
import { HistoricalDataController } from './historical-data.controller';
import { SimpleUpstoxClient } from './simple-client';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        baseURL: 'https://api.upstox.com',
        headers: {
          Authorization: `Bearer ${configService.getOrThrow<string>('UPSTOX_ACCESS_TOKEN')}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [HistoricalDataController],
  providers: [HistoricalDataBootstrapService, SimpleUpstoxClient],
  exports: [HistoricalDataBootstrapService],
})
export class HistoricalDataModule {}
