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
  private client: ReturnType<Connection["getClient"]> | undefined = undefined;
  private db: Connection["db"] | undefined = undefined;

  constructor(
    @InjectConnection(DatabaseConnections.User)
    private readonly connection: Connection
  ) {}

  async onModuleInit() {
    this.initialize();
  }

  initialize() {
    // Get the native MongoDB client from Mongoose connection
    this.client = this.connection.getClient();
    this.db = this.connection.db;
  }

  async onModuleDestroy() {
    // Cleanup is handled by Mongoose, just clear references
    this.client = undefined;
    this.db = undefined;
  }

  /**
   * Get the native MongoDB client instance
   * @returns MongoClient instance from Mongoose connection
   * @throws Error if connection is not initialized
   */
  getClient(): ReturnType<Connection["getClient"]> {
    if (!this.client) {
      this.initialize();
      if (!this.client)
        throw new Error(
          "MongoDB client not initialized. Ensure MongoDBService is properly injected and the module has started."
        );
    }
    return this.client;
  }

  /**
   * Get the database instance
   * @returns Db instance for the User database
   * @throws Error if database is not initialized
   */
  getDatabase(): NonNullable<Connection["db"]> {
    if (!this.db) {
      this.initialize();
      if (!this.db)
        throw new Error(
          "MongoDB database not initialized. Ensure MongoDBService is properly injected and the module has started."
        );
    }
    return this.db;
  }

  /**
   * Get a specific collection from the database
   * @param collectionName - Name of the collection
   * @returns MongoDB Collection instance
   */
  getCollection(
    collectionName: string
  ): ReturnType<NonNullable<Connection["db"]>["collection"]> {
    return this.getDatabase().collection(collectionName);
  }

  /**
   * Check if the MongoDB connection is ready
   * @returns true if client and db are initialized
   */
  isConnected(): boolean {
    return this.client !== undefined && this.db !== undefined;
  }

  /**
   * Get connection state
   * @returns Mongoose connection state (0=disconnected, 1=connected, 2=connecting, 3=disconnecting)
   */
  getConnectionState(): number {
    return this.connection.readyState;
  }

  /**
   * Get the database name
   * @returns Database name
   */
  getDatabaseName(): string {
    return this.getDatabase().databaseName;
  }
}
