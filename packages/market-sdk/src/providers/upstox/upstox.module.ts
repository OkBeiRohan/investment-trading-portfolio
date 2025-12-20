import { Module, Global } from "@nestjs/common";
// import { MongooseModule } from "@nestjs/mongoose";
// import { DatabaseModule, UpstoxToken, UpstoxTokenSchema } from "@repo/database";

import { AuthManagerService } from "../../auth/auth-manager.service";
import { EncryptionUtil } from "../../auth/encryption.util";
import { MultiplexerService } from "../../multiplexer/multiplexer.service";
import { SocketPool } from "../../multiplexer/socket-pool";
import { BinPacker } from "../../multiplexer/bin-packer";
import { SubscriptionManager } from "../../multiplexer/subscription-manager";
import { UpstoxProvider } from "./upstox.provider";
// import { MarketDataApi } from "./api/market-data.api";
import { OrdersApi } from "./api/orders.api";
import { UpstoxHistoricalAPI } from "./api/historical.api";
import { UpstoxHistoricalService } from "./historical.service";
// import { PortfolioApi } from "./api/portfolio.api";

@Global()
@Module({
  imports: [
    // EventEmitterModule should be provided by the consuming app
    // DatabaseModule,
    // MongooseModule.forFeature([
    //   { name: UpstoxToken.name, schema: UpstoxTokenSchema },
    // ]),
  ],
  providers: [
    // Auth
    AuthManagerService,
    EncryptionUtil,

    // Multiplexer
    MultiplexerService,
    SocketPool,
    BinPacker,
    SubscriptionManager,

    // Provider & APIs
    UpstoxProvider,
    // MarketDataApi,
    OrdersApi,
    UpstoxHistoricalAPI,
    UpstoxHistoricalService,
    // PortfolioApi,
  ],
  exports: [
    AuthManagerService,
    MultiplexerService,
    UpstoxProvider,
    UpstoxHistoricalAPI,
    UpstoxHistoricalService,
  ],
})
export class UpstoxModule {}
