import { Module } from "@nestjs/common";
import { CoreModule } from "../../../../core/core.module";
import { AuthModule } from "@repo/authentication";
import { GttService } from "./gtt.service";

@Module({
  imports: [CoreModule, AuthModule],
  providers: [GttService],
  exports: [GttService],
})
export class GttModule {}
