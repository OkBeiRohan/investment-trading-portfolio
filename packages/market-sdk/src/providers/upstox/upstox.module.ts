import { Module, Global } from "@nestjs/common";
import { AuthManagerService } from "../../auth/auth-manager.service";
import { EncryptionUtil } from "../../auth/encryption.util";
import { UpstoxProvider } from "./upstox.provider";
import { OrdersApi } from "./api/orders.api";
import { UpstoxHistoricalAPI } from "./api/historical.api";
import { UpstoxHistoricalService } from "./historical.service";
import { MongoDBModule } from "@repo/database";
import { HttpModule } from "@nestjs/axios";
import UpstoxClient from "./client";
import UpstoxHttpConfigService from "./client/http-config.service";

@Global()
@Module({
  imports: [
    // EventEmitterModule should be provided by the consuming app
    MongoDBModule,
    // MongooseModule.forFeature([
    //   { name: UpstoxToken.name, schema: UpstoxTokenSchema },
    // ]),
    HttpModule.registerAsync({
      useClass: UpstoxHttpConfigService,
    }),
  ],
  providers: [
    UpstoxHttpConfigService,

    // Auth
    AuthManagerService,
    EncryptionUtil,

    // Multiplexer
    // MultiplexerService,
    // SocketPool,
    // BinPacker,
    // SubscriptionManager,

    // Provider & APIs
    UpstoxClient,
    UpstoxProvider,
    // MarketDataApi,
    OrdersApi,
    UpstoxHistoricalAPI,
    UpstoxHistoricalService,
    // PortfolioApi,
  ],
  exports: [
    AuthManagerService,
    // MultiplexerService,
    UpstoxProvider,
    UpstoxHistoricalAPI,
    UpstoxHistoricalService,
    UpstoxClient,
  ],
})
export class UpstoxModule {}
