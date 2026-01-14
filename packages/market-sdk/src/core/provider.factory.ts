import { Injectable, Logger } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { IProvider, ProviderConfig } from "./provider.interface";
import { ProviderRegistry } from "./provider.registry";
import { ProviderNotFoundError } from "./error";

/**
 * Provider Factory - Creates and initializes provider instances
 *
 * Supports:
 * - Lazy initialization
 * - Configuration injection
 * - Provider discovery via registry
 *
 * @example
 * ```typescript
 * const upstox = await factory.create('upstox', {
 *   apiKey: 'xxx',
 *   environment: 'SANDBOX'
 * });
 * ```
 */
@Injectable()
export class ProviderFactory {
  private readonly logger = new Logger(ProviderFactory.name);
  private readonly instances = new Map<string, IProvider>();

  constructor(
    private readonly registry: ProviderRegistry,
    private readonly moduleRef: ModuleRef
  ) {}

  /**
   * Create and initialize a provider
   *
   * @param providerName - Name of the provider (upstox, binance, yahoo)
   * @param config - Provider-specific configuration
   * @returns Initialized provider instance
   */
  async create(
    providerName: string,
    config?: ProviderConfig
  ): Promise<IProvider> {
    // Check if already created
    const existing = this.instances.get(providerName);
    if (existing) {
      this.logger.debug(`Returning existing instance for ${providerName}`);
      return existing;
    }

    // Get provider from registry
    const provider = this.registry.get(providerName);
    if (!provider) {
      throw new ProviderNotFoundError(providerName);
    }

    // Initialize with config
    if (config) {
      await provider.initialize(config);
    }

    // Cache instance
    this.instances.set(providerName, provider);
    this.logger.log(`Created provider instance: ${providerName}`);

    return provider;
  }

  /**
   * Get an already created provider instance
   */
  getInstance(providerName: string): IProvider | undefined {
    return this.instances.get(providerName);
  }

  /**
   * Check if provider instance exists
   */
  hasInstance(providerName: string): boolean {
    return this.instances.has(providerName);
  }

  /**
   * Destroy a provider instance
   */
  async destroy(providerName: string): Promise<void> {
    const provider = this.instances.get(providerName);
    if (!provider) {
      return;
    }

    // Call disconnect if available
    if (provider.disconnect) {
      await provider.disconnect();
    }

    this.instances.delete(providerName);
    this.logger.log(`Destroyed provider instance: ${providerName}`);
  }

  /**
   * Destroy all provider instances
   */
  async destroyAll(): Promise<void> {
    const promises = Array.from(this.instances.keys()).map((name) =>
      this.destroy(name)
    );
    await Promise.all(promises);
    this.logger.log("Destroyed all provider instances");
  }
}
