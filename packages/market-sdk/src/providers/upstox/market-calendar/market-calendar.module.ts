import { Module } from "@nestjs/common";
import { MongoDBModule } from "@repo/database";
import { MarketCalendarService } from "./market-calendar.service";

@Module({
  imports: [MongoDBModule],
  providers: [MarketCalendarService],
  exports: [MarketCalendarService],
})
export class MarketCalendarModule {}
