import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { DatabaseModule, UpstoxToken, UpstoxTokenSchema } from "@repo/database";

import { AuthManagerService } from "../../auth/auth-manager.service";
import { EncryptionUtil } from "../../auth/encryption.util";
import { MultiplexerService } from "../../multiplexer/multiplexer.service";
import { SocketPool } from "../../multiplexer/socket-pool";
import { BinPacker } from "../../multiplexer/bin-packer";
import { SubscriptionManager } from "../../multiplexer/subscription-manager";
import { UpstoxProvider } from "./upstox.provider";
import { MarketDataApi } from "./api/market-data.api";
import { OrdersApi } from "./api/orders.api";
import { PortfolioApi } from "./api/portfolio.api";

@Global()
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    MongooseModule.forFeature([
      { name: UpstoxToken.name, schema: UpstoxTokenSchema },
    ]),
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
    MarketDataApi,
    OrdersApi,
    PortfolioApi,
  ],
  exports: [AuthManagerService, MultiplexerService, UpstoxProvider],
})
export class UpstoxModule {}
