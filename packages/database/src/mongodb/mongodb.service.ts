import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import DatabaseConnections from "./connections/connections";

/**
 * MongoDBService - Provides access to native MongoDB client and database
 *
 * This service exposes the underlying MongoDB client and database instances
 * from the Mongoose connection for operations that require native MongoDB API access.
 *
 * @example
 * ```typescript
 * // Inject the service
 * constructor(private readonly mongoDBService: MongoDBService) {}
 *
 * // Get the native MongoDB client
 * const client = this.mongoDBService.getClient();
 *
 * // Get the database
 * const db = this.mongoDBService.getDatabase();
 *
 * // Use native MongoDB operations
 * const collection = db.collection('myCollection');
 * await collection.createIndex({ field: 1 });
 * ```
 */
@Injectable()
export class MongoDBService implements OnModuleInit, OnModuleDestroy {
  private mongoDB: Record<
    keyof typeof DatabaseConnections,
    | {
        client?: ReturnType<Connection["getClient"]>;
        db?: Connection["db"];
      }
    | undefined
  > = {
    User: undefined,
    Trading: undefined,
    MarketData: undefined,
    Logging: undefined,
  };
  private db: Connection["db"] | undefined = undefined;

  constructor(
    @InjectConnection(DatabaseConnections.User)
    private readonly userConnection: Connection,
    @InjectConnection(DatabaseConnections.Trading)
    private readonly tradingConnection: Connection,
    @InjectConnection(DatabaseConnections.MarketData)
    private readonly marketDataConnection: Connection,
    @InjectConnection(DatabaseConnections.Logging)
    private readonly loggingConnection: Connection,
  ) {}

  async onModuleInit() {
    this.initialize();
  }

  initialize() {
    // Get the native MongoDB client from Mongoose connection

    this.mongoDB.User = {
      client: this.userConnection.getClient(),
      db: this.userConnection.db,
    };
    this.mongoDB.Trading = {
      client: this.tradingConnection.getClient(),
      db: this.tradingConnection.db,
    };
    this.mongoDB.MarketData = {
      client: this.marketDataConnection.getClient(),
      db: this.marketDataConnection.db,
    };
    this.mongoDB.Logging = {
      client: this.loggingConnection.getClient(),
      db: this.loggingConnection.db,
    };
  }

  async onModuleDestroy() {
    // Cleanup is handled by Mongoose, just clear references
    this.mongoDB = {
      User: undefined,
      Trading: undefined,
      MarketData: undefined,
      Logging: undefined,
    };
  }

  /**
   * Get the native MongoDB client instance
   * @returns MongoClient instance from Mongoose connection
   * @throws Error if connection is not initialized
   */
  getClient(
    connection: keyof typeof DatabaseConnections = "User",
  ): ReturnType<Connection["getClient"]> {
    if (!this.mongoDB[connection]?.client) {
      this.initialize();
      if (!this.mongoDB[connection]?.client)
        throw new Error(
          `MongoDB client for ${connection} not initialized. Ensure MongoDBService is properly injected and the module has started.`,
        );
    }
    return this.mongoDB[connection].client;
  }

  /**
   * Get the database instance
   * @returns Db instance for the User database
   * @throws Error if database is not initialized
   */
  getDatabase(
    connection: keyof typeof DatabaseConnections = "User",
  ): NonNullable<Connection["db"]> {
    if (!this.mongoDB[connection]?.db) {
      this.initialize();
      if (!this.mongoDB[connection]?.db)
        throw new Error(
          `MongoDB database for ${connection} not initialized. Ensure MongoDBService is properly injected and the module has started.`,
        );
    }
    return this.mongoDB[connection].db;
  }

  /**
   * Get a specific collection from the database
   * @param collectionName - Name of the collection
   * @returns MongoDB Collection instance
   */
  getCollection(
    collectionName: string,
    connection: keyof typeof DatabaseConnections = "User",
  ): ReturnType<NonNullable<Connection["db"]>["collection"]> {
    return this.getDatabase(connection).collection(collectionName);
  }

  /**
   * Check if the MongoDB connection is ready
   * @returns true if client and db are initialized
   */
  isConnected(connection: keyof typeof DatabaseConnections = "User"): boolean {
    return (
      this.mongoDB[connection]?.client !== undefined &&
      this.mongoDB[connection]?.db !== undefined
    );
  }

  /**
   * Get connection state
   * @returns Mongoose connection state (0=disconnected, 1=connected, 2=connecting, 3=disconnecting)
   */
  getConnectionState(
    connection: keyof typeof DatabaseConnections = "User",
  ): number {
    switch (connection) {
      case "User":
        return this.userConnection.readyState;
      case "Trading":
        return this.tradingConnection.readyState;
      case "MarketData":
        return this.marketDataConnection.readyState;
      case "Logging":
        return this.loggingConnection.readyState;
      default:
        throw new Error(`Unknown connection: ${connection}`);
    }
  }

  /**
   * Get the database name
   * @returns Database name
   */
  getDatabaseName(
    connection: keyof typeof DatabaseConnections = "User",
  ): string {
    return this.getDatabase(connection).databaseName;
  }
}
