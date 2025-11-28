import { Module, Global } from "@nestjs/common";
import { BetterAuthAdapterFactory } from "./adapters/adapter.factory";
import { AuthService } from "./services/auth.service";
import { EmailService } from "./services/email.service";
import { MongoDBModule } from "@repo/database";

@Global()
@Module({
  imports: [MongoDBModule],
  providers: [BetterAuthAdapterFactory, EmailService, AuthService],
  exports: [AuthService],
})
export class AuthModule {}
