import { Module, Global } from "@nestjs/common";
import { MongoDBModule, RedisModule } from "@repo/database";
import { AuthManagerService } from "./auth-manager.service";
import { TokenRefreshService } from "./token-refresh.service";
import { TokenStorageService } from "./token-storage.service";
import { UpstoxReAuthService } from "./upstox-reauth.service";

/**
 * Auth Module
 *
 * Provides multi-tenant authentication services:
 * - Token management (Redis + MongoDB)
 * - Token refresh
 * - Token storage with encryption
 * - Upstox Phase 2 daily re-authentication
 */
@Global()
@Module({
  imports: [MongoDBModule, RedisModule],
  providers: [AuthManagerService, TokenRefreshService, TokenStorageService, UpstoxReAuthService],
  exports: [AuthManagerService, TokenRefreshService, TokenStorageService, UpstoxReAuthService],
})
export class AuthModule {}
