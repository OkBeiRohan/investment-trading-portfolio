import { Module, Global } from "@nestjs/common";
import { MongoDBModule, RedisModule } from "@repo/database";
import { AuthManagerService } from "./auth-manager.service";
import { TokenRefreshService } from "./token-refresh.service";
import { TokenStorageService } from "./token-storage.service";

/**
 * Auth Module
 *
 * Provides multi-tenant authentication services:
 * - Token management (Redis + MongoDB)
 * - Token refresh
 * - Token storage with encryption
 */
@Global()
@Module({
  imports: [MongoDBModule, RedisModule],
  providers: [AuthManagerService, TokenRefreshService, TokenStorageService],
  exports: [AuthManagerService, TokenRefreshService, TokenStorageService],
})
export class AuthModule {}
