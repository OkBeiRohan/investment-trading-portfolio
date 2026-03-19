import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import UpstoxHttpConfigService from "./config/http-config.service";
import { MarketDataModule } from "./market-data/market-data.module";
import { HistoricalModule } from "./historical/historical.module";
import { OrdersModule } from "./orders/orders.module";
import { PortfolioModule } from "./portfolio/portfolio.module";
import { GttModule } from "./gtt/gtt.module";
import { TradePnlModule } from "./trade-pnl/trade-pnl.module";
import { ChargesModule } from "./charges/charges.module";

/**
 * Upstox API Module - Root module for all API endpoints
 *
 * UpstoxApiModule
 * +-- AuthenticationModule (OAuth2)
 * +-- MarketDataModule (quotes, option chain, market info, WS auth)
 * +-- HistoricalModule (candles, historical data)
 * +-- OrdersModule (place, modify, cancel)
 * +-- PortfolioModule (positions, holdings, funds)
 * +-- GttModule (GTT orders)
 * +-- TradePnlModule (P&L reports)
 * +-- ChargesModule (brokerage, margins)
 */
@Module({
  imports: [
    HttpModule.registerAsync({
      useClass: UpstoxHttpConfigService,
    }),
    MarketDataModule,
    HistoricalModule,
    OrdersModule,
    PortfolioModule,
    GttModule,
    TradePnlModule,
    ChargesModule,
  ],
  providers: [],
  exports: [
    MarketDataModule,
    HistoricalModule,
    OrdersModule,
    PortfolioModule,
    GttModule,
    TradePnlModule,
    ChargesModule,
  ],
})
export class UpstoxApiModule { }
