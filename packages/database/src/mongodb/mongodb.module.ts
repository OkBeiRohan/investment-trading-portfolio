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

export interface DatabaseModuleOptions {
  mongoUri: string;
  redisUrl?: string;
}

@Global()
@Module({})
export class MongoDBModule {
  static forRoot(options: DatabaseModuleOptions): DynamicModule {
    return {
      module: MongoDBModule,
      imports: [
        MongooseModule.forRoot(options.mongoUri, {
          dbName: DatabaseConnections.User,
          retryWrites: true,
          retryAttempts: 5,
          retryDelay: 3000,
          writeConcern: { w: "majority" },
        }),
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
      ],
      exports: [
        UserRepository,
        SessionRepository,
        AccountRepository,
        VerificationRepository,
        OrganizationRepository,
        TwoFactorRepository,
        PasskeyRepository,
      ],
    };
  }
}
