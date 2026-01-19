import { Global, Module } from "@nestjs/common";
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
  BrokerAccountRepository,
} from "./repositories";
import {
  Invitation,
  InvitationSchema,
  Member,
  MemberSchema,
  Organization,
  OrganizationSchema,
} from "./schemas/organization";
import { BrokerAccount, BrokerAccountSchema } from "./schemas/trading";
import { AuthRepositoryFactory } from "./adapter/adapter.factory";
import { MongoDBService } from "./mongodb.service";
import {
  ConstituentChangeRepository,
  InstrumentRepository,
  ProcessingLogRepository,
  IngestionLogRepository,
  DataInventoryRepository,
} from "./repositories/market-data";
import {
  IngestionLog,
  IngestionLogSchema,
  DataInventory,
  DataInventorySchema,
  Instrument,
  InstrumentSchema,
  ProcessingLog,
  ProcessingLogSchema,
  ConstituentChange,
  ConstituentChangeSchema,
} from "./schemas/market-data";

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
        // For replica set with transactions, ensure MONGODB_URI includes ?replicaSet=rs0
        // Example: mongodb://localhost:27017/?replicaSet=rs0
      },
    ),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || "mongodb://localhost:27017",
      {
        connectionName: DatabaseConnections.Trading,
        dbName: DatabaseConnections.Trading,
        retryWrites: true,
        retryAttempts: 5,
        retryDelay: 3000,
        writeConcern: { w: "majority" },
      },
    ),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || "mongodb://localhost:27017",
      {
        connectionName: DatabaseConnections.MarketData,
        dbName: DatabaseConnections.MarketData,
        retryWrites: true,
        retryAttempts: 5,
        retryDelay: 3000,
        writeConcern: { w: "majority" },
      },
    ),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || "mongodb://localhost:27017",
      {
        connectionName: DatabaseConnections.Logging,
        dbName: DatabaseConnections.Logging,
        retryWrites: true,
        retryAttempts: 5,
        retryDelay: 3000,
        writeConcern: { w: "majority" },
      },
    ),
    MongooseModule.forFeature(
      [
        { name: User.name, schema: UserSchema, collection: "user" },
        { name: Account.name, schema: AccountSchema, collection: "account" },
        { name: Session.name, schema: SessionSchema, collection: "session" },
        {
          name: Verification.name,
          schema: VerificationSchema,
          collection: "verification",
        },
        {
          name: TwoFactor.name,
          schema: TwoFactorSchema,
          collection: "twoFactor",
        },
        { name: Passkey.name, schema: PasskeySchema, collection: "passkey" },
        {
          name: Organization.name,
          schema: OrganizationSchema,
          collection: "organization",
        },
        { name: Member.name, schema: MemberSchema, collection: "member" },
        {
          name: Invitation.name,
          schema: InvitationSchema,
          collection: "invitation",
        },
      ],
      DatabaseConnections.User,
    ),
    MongooseModule.forFeature(
      [
        {
          name: BrokerAccount.name,
          schema: BrokerAccountSchema,
          collection: "broker_accounts",
        },
      ],
      DatabaseConnections.Trading,
    ),
    MongooseModule.forFeature(
      [
        {
          name: DataInventory.name,
          schema: DataInventorySchema,
          collection: "data_inventory",
        },
        {
          name: Instrument.name,
          schema: InstrumentSchema,
          collection: "instrument",
        },
        {
          name: ConstituentChange.name,
          schema: ConstituentChangeSchema,
          collection: "constituent_change",
        },
      ],
      DatabaseConnections.MarketData,
    ),
    MongooseModule.forFeature(
      [
        {
          name: IngestionLog.name,
          schema: IngestionLogSchema,
          collection: "ingestion_log",
        },
        {
          name: ProcessingLog.name,
          schema: ProcessingLogSchema,
          collection: "processing_log",
        },
      ],
      DatabaseConnections.Logging,
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
    BrokerAccountRepository,
    InstrumentRepository,
    ProcessingLogRepository,
    IngestionLogRepository,
    DataInventoryRepository,
    ConstituentChangeRepository,
    AuthRepositoryFactory,
    MongoDBService,
  ],
  exports: [
    UserRepository,
    SessionRepository,
    AccountRepository,
    VerificationRepository,
    OrganizationRepository,
    TwoFactorRepository,
    PasskeyRepository,
    BrokerAccountRepository,
    InstrumentRepository,
    ProcessingLogRepository,
    IngestionLogRepository,
    DataInventoryRepository,
    ConstituentChangeRepository,
    AuthRepositoryFactory,
    MongoDBService,
  ],
})
export class MongoDBModule {}
