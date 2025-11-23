import { Module, DynamicModule, Global } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./guards/auth.guard";
import { OrganizationGuard } from "./guards/organization.guard";
import { RolesGuard } from "./guards/roles.guard";
import type { BetterAuthServerConfig } from "../server/auth.config";

export const BETTER_AUTH_OPTIONS = "BETTER_AUTH_OPTIONS";

@Global()
@Module({})
export class AuthModule {
  static forRoot(config: BetterAuthServerConfig): DynamicModule {
    return {
      module: AuthModule,
      providers: [
        {
          provide: BETTER_AUTH_OPTIONS,
          useValue: config,
        },
        AuthService,
        AuthGuard,
        OrganizationGuard,
        RolesGuard,
      ],
      exports: [AuthService, AuthGuard, OrganizationGuard, RolesGuard],
    };
  }
}
