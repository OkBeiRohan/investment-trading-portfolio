import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BetterAuthAdapterFactory } from "./adapters/adapter.factory";
import { AuthService } from "./services/auth.service";
import { EmailService } from "./services/email.service";
import { AuthGuard } from "./guards/auth.guard";
import { OrganizationGuard } from "./guards/organization.guard";
import { RolesGuard } from "./guards/roles.guard";
import { MongoDBModule } from "@repo/database";

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), MongoDBModule],
  providers: [
    BetterAuthAdapterFactory,
    EmailService,
    AuthService,
    AuthGuard,
    OrganizationGuard,
    RolesGuard,
  ],
  exports: [AuthService],
})
export class AuthModule {}
