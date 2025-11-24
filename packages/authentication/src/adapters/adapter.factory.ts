import { Injectable } from "@nestjs/common";
import { mongoAdapter } from "./mongodb.adapter";
import { AuthRepositoryFactory } from "@repo/database";

@Injectable()
export class BetterAuthAdapterFactory {
  constructor(private repositories: AuthRepositoryFactory) {}

  createAdapter(debugLogs = false) {
    return mongoAdapter(this.repositories.getRepositories(), { debugLogs });
  }
}
