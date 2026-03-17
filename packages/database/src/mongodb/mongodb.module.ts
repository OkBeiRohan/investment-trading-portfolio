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
  TradingConfigRepository,
  SystemConfigRepository,
  AuditLogRepository,
} from "./repositories";
import {
  Invitation,
  InvitationSchema,
  Member,
  MemberSchema,
  Organization,
  OrganizationSchema,
} from "./schemas/organization";
import {
  BrokerAccount,
  BrokerAccountSchema,
  TradingConfig,
  TradingConfigSchema,
  SystemConfig,
  SystemConfigSchema,
  AuditLog,
  AuditLogSchema,
} from "./schemas/trading";
import { AuthRepositoryFactory } from "./adapter/adapter.factory";
import { MongoDBService } from "./mongodb.service";
import { DbConfigService } from "./services/db-config.service";
import {
  ConstituentChangeRepository,
  InstrumentRepository,
  ProcessingLogRepository,
  IngestionLogRepository,
  DataInventoryRepository,
  FeatureConfigRepository,
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
  FeatureConfig,
  FeatureConfigSchema,
} from "./schemas/market-data";
import {
  Experiment,
  ExperimentSchema,
  TrainingRun,
  TrainingRunSchema,
} from "./schemas/training";
import {
  ExperimentRepository,
  TrainingRunRepository,
} from "./repositories/training";

// Set mongoose default to return updated doc (suppresses { new: true } deprecation from better-auth)
import mongoose from "mongoose";
mongoose.set("returnDocument", "after");

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
        {
          name: TradingConfig.name,
          schema: TradingConfigSchema,
          collection: "trading_configs",
        },
        {
          name: SystemConfig.name,
          schema: SystemConfigSchema,
          collection: "system_configs",
        },
        {
          name: Experiment.name,
          schema: ExperimentSchema,
          collection: "experiments",
        },
        {
          name: TrainingRun.name,
          schema: TrainingRunSchema,
          collection: "training_runs",
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
        {
          name: FeatureConfig.name,
          schema: FeatureConfigSchema,
          collection: "feature_configs",
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
        {
          name: AuditLog.name,
          schema: AuditLogSchema,
          collection: "audit_logs",
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
    TradingConfigRepository,
    SystemConfigRepository,
    AuditLogRepository,
    FeatureConfigRepository,
    ExperimentRepository,
    TrainingRunRepository,
    AuthRepositoryFactory,
    MongoDBService,
    DbConfigService,
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
    TradingConfigRepository,
    SystemConfigRepository,
    AuditLogRepository,
    FeatureConfigRepository,
    ExperimentRepository,
    TrainingRunRepository,
    AuthRepositoryFactory,
    MongoDBService,
    DbConfigService,
  ],
})
export class MongoDBModule {}
