import { Module } from "@nestjs/common";
import { AuthenticationModule } from "./authentication/api/authentication.module";
import { HttpModule } from "@nestjs/axios";
import UpstoxHttpConfigService from "./config/http-config.service";
import { MarketDataModule } from "./market-data/market-data.module";
import { HistoricalModule } from "./historical/historical.module";
import { OrdersModule } from "./orders/orders.module";
import { PortfolioModule } from "./portfolio/portfolio.module";

/**
 * Upstox API Module - Root module for all API endpoints
 *
 * Cascading structure:
 * UpstoxApiModule
 * ├── AuthenticationModule (OAuth2)
 * ├── MarketDataModule (quotes, option chain)
 * ├── HistoricalModule (candles, historical data)
 * ├── OrdersModule (place, modify, cancel)
 * └── PortfolioModule (positions, holdings, funds)
 */
@Module({
  imports: [
    HttpModule.registerAsync({
      useClass: UpstoxHttpConfigService,
    }),
    AuthenticationModule,
    MarketDataModule,
    HistoricalModule,
    OrdersModule,
    PortfolioModule,
  ],
  providers: [],
  exports: [
    AuthenticationModule,
    MarketDataModule,
    HistoricalModule,
    OrdersModule,
    PortfolioModule,
  ],
})
export class UpstoxApiModule {}
