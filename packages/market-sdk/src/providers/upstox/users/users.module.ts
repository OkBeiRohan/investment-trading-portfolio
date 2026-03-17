import { Module } from "@nestjs/common";
import { CoreModule } from "../../../core/core.module";
import { AuthModule } from "@repo/authentication";
import { UpstoxUsersService } from "./users.service";

/**
 * Users Module
 *
 * Provides:
 * - User profile
 * - Funds and margin
 */
@Module({
  imports: [CoreModule, AuthModule],
  providers: [UpstoxUsersService],
  exports: [UpstoxUsersService],
})
export class UsersModule {}
