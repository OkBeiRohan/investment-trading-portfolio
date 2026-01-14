import { Module } from "@nestjs/common";
import { CoreModule } from "../../../../core/core.module";
import { AuthModule } from "../../../../auth/auth.module";
import { PortfolioRepository } from "./portfolio.repository";
import { PortfolioService } from "./portfolio.service";

/**
 * Portfolio Module
 *
 * Provides:
 * - Positions
 * - Holdings
 * - Funds and margin
 */
@Module({
  imports: [CoreModule, AuthModule],
  providers: [PortfolioRepository, PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
