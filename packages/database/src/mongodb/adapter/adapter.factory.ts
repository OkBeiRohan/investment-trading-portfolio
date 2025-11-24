import { Injectable } from "@nestjs/common";
import {
  UserRepository,
  SessionRepository,
  AccountRepository,
  VerificationRepository,
  OrganizationRepository,
  TwoFactorRepository,
  PasskeyRepository,
} from "../repositories";
import { AuthRepositories } from "./auth-repositories.interface";

@Injectable()
export class AuthRepositoryFactory {
  constructor(
    private userRepository: UserRepository,
    private sessionRepository: SessionRepository,
    private accountRepository: AccountRepository,
    private verificationRepository: VerificationRepository,
    private organizationRepository: OrganizationRepository,
    private twoFactorRepository: TwoFactorRepository,
    private passkeyRepository: PasskeyRepository
  ) {}

  getRepositories(): AuthRepositories {
    return {
      users: this.userRepository,
      sessions: this.sessionRepository,
      accounts: this.accountRepository,
      verifications: this.verificationRepository,
      organizations: this.organizationRepository,
      twoFactors: this.twoFactorRepository,
      passkeys: this.passkeyRepository,
    };
  }
}
