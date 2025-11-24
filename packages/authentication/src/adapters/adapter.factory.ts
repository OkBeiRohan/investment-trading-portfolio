import { Injectable } from "@nestjs/common";
import type { DBAdapter } from "@better-auth/core/db/adapter";
import type { BetterAuthOptions } from "better-auth";
import { mongoAdapter } from "./mongodb.adapter";
import {
  UserRepository,
  SessionRepository,
  AccountRepository,
  VerificationRepository,
  OrganizationRepository,
  TwoFactorRepository,
  PasskeyRepository,
} from "@repo/database";

@Injectable()
export class BetterAuthAdapterFactory {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly accountRepository: AccountRepository,
    private readonly verificationRepository: VerificationRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly twoFactorRepository: TwoFactorRepository,
    private readonly passkeyRepository: PasskeyRepository
  ) {}

  createAdapter(debugLogs = false): (options?: BetterAuthOptions) => DBAdapter {
    return mongoAdapter(
      {
        users: this.userRepository,
        sessions: this.sessionRepository,
        accounts: this.accountRepository,
        verifications: this.verificationRepository,
        organizations: this.organizationRepository,
        twoFactors: this.twoFactorRepository,
        passkeys: this.passkeyRepository,
      },
      { debugLogs }
    );
  }
}
