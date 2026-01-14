import { Module } from "@nestjs/common";
import { CoreModule } from "../../../../core/core.module";
import { AuthModule } from "../../../../auth/auth.module";
import { MarketDataRepository } from "./market-data.repository";
import { MarketDataService } from "./market-data.service";

/**
 * Market Data Module
 *
 * Provides:
 * - Real-time quotes
 * - Full market quotes
 * - Option chain data
 * - Market depth (L2 data)
 */
@Module({
  imports: [CoreModule, AuthModule],
  providers: [MarketDataRepository, MarketDataService],
  exports: [MarketDataService],
})
export class MarketDataModule {}
