import { Module } from "@nestjs/common";
import { CoreModule } from "../../../../core/core.module";
import { AuthModule } from "@repo/authentication";
import { TradePnlService } from "./trade-pnl.service";

@Module({
  imports: [CoreModule, AuthModule],
  providers: [TradePnlService],
  exports: [TradePnlService],
})
export class TradePnlModule {}
