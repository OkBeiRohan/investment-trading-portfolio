/**
 * Strike Selector Module
 * Provides institutional-grade option strike selection capabilities
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { StrikeSelectorService } from './strike-selector.service';
import { StrikeSelectorBootstrap } from './strike-selector.bootstrap';
import { UpstoxClient } from '../historical-data/upstox-client';
import { DatabaseModule } from '@repo/database';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
      baseURL: 'https://api.upstox.com',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }),
    DatabaseModule.forMarketFeeder(),
  ],
  providers: [UpstoxClient, StrikeSelectorService, StrikeSelectorBootstrap],
  exports: [StrikeSelectorService],
})
export class StrikeSelectorModule {}
