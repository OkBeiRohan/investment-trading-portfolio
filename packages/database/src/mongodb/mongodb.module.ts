import { DynamicModule, Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import DatabaseConnections from "./connections/connections";
import { User, UserSchema } from "./schemas/user/user.schema";
import {
  Account,
  AccountSchema,
  Passkey,
  PasskeySchema,
  Session,
  SessionSchema,
  TwoFactor,
  TwoFactorSchema,
  Verification,
  VerificationSchema,
} from "./schemas/authentication";
import {
  UserRepository,
  SessionRepository,
  AccountRepository,
  VerificationRepository,
  OrganizationRepository,
  TwoFactorRepository,
  PasskeyRepository,
} from "./repositories";
import {
  Invitation,
  InvitationSchema,
  Member,
  MemberSchema,
  Organization,
  OrganizationSchema,
} from "./schemas/organization";
import { AuthRepositoryFactory } from "./adapter/adapter.factory";

@Global()
@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || "mongodb://localhost:27017",
      {
        connectionName: DatabaseConnections.User,
        dbName: DatabaseConnections.User,
        retryWrites: true,
        retryAttempts: 5,
        retryDelay: 3000,
        writeConcern: { w: "majority" },
      }
    ),
    MongooseModule.forFeature(
      [
        { name: User.name, schema: UserSchema },
        { name: Account.name, schema: AccountSchema },
        { name: Session.name, schema: SessionSchema },
        { name: Verification.name, schema: VerificationSchema },
        { name: TwoFactor.name, schema: TwoFactorSchema },
        { name: Passkey.name, schema: PasskeySchema },
        { name: Organization.name, schema: OrganizationSchema },
        { name: Member.name, schema: MemberSchema },
        { name: Invitation.name, schema: InvitationSchema },
      ],
      DatabaseConnections.User
    ),
  ],
  providers: [
    UserRepository,
    SessionRepository,
    AccountRepository,
    VerificationRepository,
    OrganizationRepository,
    TwoFactorRepository,
    PasskeyRepository,
    AuthRepositoryFactory,
  ],
  exports: [
    UserRepository,
    SessionRepository,
    AccountRepository,
    VerificationRepository,
    OrganizationRepository,
    TwoFactorRepository,
    PasskeyRepository,
    AuthRepositoryFactory,
  ],
})
export class MongoDBModule {}
