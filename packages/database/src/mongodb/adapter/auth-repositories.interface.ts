import {
  UserRepository,
  SessionRepository,
  AccountRepository,
  VerificationRepository,
  OrganizationRepository,
  TwoFactorRepository,
  PasskeyRepository,
} from "../repositories";

export interface AuthRepositories {
  users: UserRepository;
  sessions: SessionRepository;
  accounts: AccountRepository;
  verifications: VerificationRepository;
  organizations: OrganizationRepository;
  twoFactors: TwoFactorRepository;
  passkeys: PasskeyRepository;
}
