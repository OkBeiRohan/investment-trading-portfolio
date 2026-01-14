import { Module, Global } from "@nestjs/common";
import { MongoDBModule } from "@repo/database";
import UpstoxClient from "./client";

@Global()
@Module({
  imports: [MongoDBModule],
  providers: [UpstoxClient],
  exports: [UpstoxClient],
})
export class UpstoxModule {}
