/**
 * MongoDB Database Client
 * Singleton pattern for database connection management
 */

import mongoose from "mongoose";

export interface DatabaseConfig {
  uri: string;
  database?: string;
}

export class DatabaseClient {
  private static instance: DatabaseClient;
  private connection: typeof mongoose | null = null;
  private isConnected = false;

  private constructor() {}

  static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  /**
   * Connect to MongoDB
   */
  async connect(config: DatabaseConfig): Promise<typeof mongoose> {
    if (this.isConnected && this.connection) {
      console.log("📦 Using existing MongoDB connection");
      return this.connection;
    }

    try {
      this.connection = await mongoose.connect(config.uri);
      this.isConnected = true;

      console.log(`✅ MongoDB connected: ${config.database || "default"}`);

      return this.connection;
    } catch (error) {
      console.error("❌ MongoDB connection failed:", error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      await mongoose.disconnect();
      this.connection = null;
      this.isConnected = false;
      console.log("✅ MongoDB disconnected");
    }
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Get the underlying mongoose connection
   */
  getConnection(): typeof mongoose {
    if (!this.connection) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.connection;
  }
}

// Export singleton instance
export const db = DatabaseClient.getInstance();

// Export mongoose for schema definitions
export { mongoose };
