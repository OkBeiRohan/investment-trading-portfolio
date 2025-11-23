import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import DatabaseConnections from "./connections/connections";
import { User, UserSchema } from "./schemas/user/user.schema";
import {
  Session,
  SessionSchema,
  Verification,
  VerificationSchema,
} from "./schemas/authentication";
import { UserRepository } from "./repositories/user.repository";
import { SessionRepository } from "./repositories/authentication/session.repository";

@Global()
@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || "mongodb://localhost:27017",
      {
        connectionName: DatabaseConnections.User,
        retryWrites: true,
        writeConcern: { w: "majority" },
      }
    ),
    MongooseModule.forFeature(
      [
        {
          name: User.name,
          schema: UserSchema,
        },
        { name: Session.name, schema: SessionSchema },
        { name: Verification.name, schema: VerificationSchema },
      ],
      DatabaseConnections.User
    ),
  ],
  providers: [UserRepository, SessionRepository],
  exports: [MongooseModule, UserRepository, SessionRepository],
})
export class MongoDBModule {}
