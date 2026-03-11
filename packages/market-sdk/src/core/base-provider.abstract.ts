import { Logger } from "@nestjs/common";
import { IProvider, ProviderConfig, ProviderFeatures } from "./provider.interface";

/**
 * Base abstract class for all providers
 * Provides common functionality and enforces interface contracts
 */
export abstract class BaseProvider implements IProvider {
  protected readonly logger: Logger;
  protected config!: ProviderConfig;
  protected initialized = false;

  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly supportedFeatures: ProviderFeatures;

  constructor(protected readonly providerName: string) {
    this.logger = new Logger(providerName);
  }

  async initialize(config: ProviderConfig): Promise<void> {
    this.config = config;
    this.logger.log(`Initializing ${this.name} provider...`);

    await this.onInitialize(config);

    this.initialized = true;
    this.logger.log(`${this.name} provider initialized successfully`);
  }

  async healthCheck(): Promise<boolean> {
    if (!this.initialized) {
      this.logger.warn(`${this.name} provider not initialized`);
      return false;
    }

    try {
      return await this.performHealthCheck();
    } catch (error) {
      this.logger.error(`Health check failed for ${this.name}:`, error);
      return false;
    }
  }

  /**
   * Provider-specific initialization logic
   */
  protected abstract onInitialize(config: ProviderConfig): Promise<void>;

  /**
   * Provider-specific health check implementation
   */
  protected abstract performHealthCheck(): Promise<boolean>;

  /**
   * Ensure provider is initialized before operations
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        `${this.name} provider not initialized. Call initialize() first.`
      );
    }
  }
}
