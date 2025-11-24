import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  UserRepository,
  SessionRepository,
  AccountRepository,
  VerificationRepository,
  OrganizationRepository,
  TwoFactorRepository,
  PasskeyRepository,
} from "../repositories";
import {
  User,
  Session,
  Account,
  Verification,
  Organization,
  Member,
  Invitation,
  TwoFactor,
  Passkey,
} from "../schemas";
import { AuthRepositories } from "./auth-repositories.interface";

@Injectable()
export class AuthRepositoryFactory {
  private repositories: AuthRepositories;

  constructor(
    @InjectModel(User.name) userModel: Model<User>,
    @InjectModel(Session.name) sessionModel: Model<Session>,
    @InjectModel(Account.name) accountModel: Model<Account>,
    @InjectModel(Verification.name) verificationModel: Model<Verification>,
    @InjectModel(Organization.name) organizationModel: Model<Organization>,
    @InjectModel(Member.name) memberModel: Model<Member>,
    @InjectModel(Invitation.name) invitationModel: Model<Invitation>,
    @InjectModel(TwoFactor.name) twoFactorModel: Model<TwoFactor>,
    @InjectModel(Passkey.name) passkeyModel: Model<Passkey>
  ) {
    this.repositories = {
      users: new UserRepository(userModel),
      sessions: new SessionRepository(sessionModel),
      accounts: new AccountRepository(accountModel),
      verifications: new VerificationRepository(verificationModel),
      organizations: new OrganizationRepository(
        organizationModel,
        memberModel,
        invitationModel
      ),
      twoFactors: new TwoFactorRepository(twoFactorModel),
      passkeys: new PasskeyRepository(passkeyModel),
    };
  }

  getRepositories() {
    return this.repositories;
  }
}
