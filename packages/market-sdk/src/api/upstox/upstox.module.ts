import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { DatabaseModule, UpstoxToken, UpstoxTokenSchema } from "@repo/database";

// Services & Utilities
import { AuthService } from "./auth/auth.service";
import { EncryptionUtil } from "./auth/encryption.utils";
import { MultiplexerService } from "./market-data/multiplexer.service";
import { SocketPool } from "./market-data/socket/socket-pool";
import { OrdersService } from "./orders/orders.service";

// Allocator Algorithms
import { BinPacker } from "./market-data/allocator/bin-packer";
import { SubscriptionPriorityQueue } from "./market-data/allocator/priority-queue";

@Global() // Makes services available to all Apps (Algo Engine, Dashboard) without re-importing
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    MongooseModule.forFeature([
      { name: UpstoxToken.name, schema: UpstoxTokenSchema },
    ]),
  ],
  providers: [
    AuthService,
    EncryptionUtil,
    MultiplexerService,
    SocketPool,
    OrdersService,
    BinPacker,
    SubscriptionPriorityQueue,
  ],
  exports: [
    AuthService,
    EncryptionUtil,
    MultiplexerService,
    SocketPool,
    OrdersService,
    BinPacker,
    SubscriptionPriorityQueue,
  ],
})
export class UpstoxModule {}
