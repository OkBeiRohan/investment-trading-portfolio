import { Module } from "@nestjs/common";
import { CoreModule } from "../../../../core/core.module";
import { AuthModule } from "../../../../auth/auth.module";
import { OrdersRepository } from "./orders.repository";
import { OrdersService } from "./orders.service";

/**
 * Orders Module
 *
 * Provides:
 * - Place orders (MARKET, LIMIT, SL, SL-M)
 * - Modify orders
 * - Cancel orders
 * - Order book
 * - Order details
 */
@Module({
  imports: [CoreModule, AuthModule],
  providers: [OrdersRepository, OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
