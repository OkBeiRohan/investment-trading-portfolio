import { Module } from "@nestjs/common";
import { ConstituentWeightRouter } from "./constituent-weight.router";

@Module({
  providers: [ConstituentWeightRouter],
})
export class MarketDataModule {}
