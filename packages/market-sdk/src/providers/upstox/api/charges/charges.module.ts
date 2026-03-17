import { Module } from "@nestjs/common";
import { CoreModule } from "../../../../core/core.module";
import { AuthModule } from "@repo/authentication";
import { ChargesService } from "./charges.service";

/**
 * Charges Module
 *
 * Provides:
 * - Brokerage calculation
 * - Margin calculation
 */
@Module({
  imports: [CoreModule, AuthModule],
  providers: [ChargesService],
  exports: [ChargesService],
})
export class ChargesModule {}
