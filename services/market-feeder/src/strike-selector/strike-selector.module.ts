/**
 * Strike Selector Module
 * Provides institutional-grade option strike selection capabilities
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StrikeSelectorService } from './strike-selector.service';
import { UpstoxClient } from '../historical-data/upstox-client';
import { DatabaseModule } from '@repo/database';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        timeout: 30000,
        maxRedirects: 5,
        baseURL: 'https://api.upstox.com',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${configService.get<string>('UPSTOX_ACCESS_TOKEN', '')}`,
        },
      }),
      inject: [ConfigService],
    }),
    DatabaseModule.forMarketFeeder(),
  ],
  providers: [UpstoxClient, StrikeSelectorService],
  exports: [StrikeSelectorService],
})
export class StrikeSelectorModule {}
