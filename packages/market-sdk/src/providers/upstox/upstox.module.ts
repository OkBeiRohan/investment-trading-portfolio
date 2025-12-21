import { Module, Global } from "@nestjs/common";
import { AuthManagerService } from "../../auth/auth-manager.service";
import { EncryptionUtil } from "../../auth/encryption.util";
import { MultiplexerService } from "../../multiplexer/multiplexer.service";
import { SocketPool } from "../../multiplexer/socket-pool";
import { BinPacker } from "../../multiplexer/bin-packer";
import { SubscriptionManager } from "../../multiplexer/subscription-manager";
import { UpstoxProvider } from "./upstox.provider";
import { OrdersApi } from "./api/orders.api";
import { UpstoxHistoricalAPI } from "./api/historical.api";
import { UpstoxHistoricalService } from "./historical.service";
import { MongoDBModule } from "@repo/database";

@Global()
@Module({
  imports: [
    // EventEmitterModule should be provided by the consuming app
    MongoDBModule,
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
