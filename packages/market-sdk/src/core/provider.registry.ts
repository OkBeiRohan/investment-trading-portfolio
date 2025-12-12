import { Logger } from "@nestjs/common";
import { IProvider } from "./provider.interface";
import { ProviderError } from "./error";

export type ProviderCapability =
  | "market-data"
  | "orders"
  | "portfolio"
  | "websocket";

export interface ProviderMetadata {
  name: string;
  version: string;
  capabilities: ProviderCapability[];
  isActive: boolean;
}

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers = new Map<string, IProvider>();
  private metadata = new Map<string, ProviderMetadata>();
  private readonly logger = new Logger(ProviderRegistry.name);

  private constructor() {}

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  register(provider: IProvider, capabilities: ProviderCapability[]): void {
    if (this.providers.has(provider.name)) {
      throw new ProviderError(
        `Provider ${provider.name} is already registered`
      );
    }

    this.providers.set(provider.name, provider);
    this.metadata.set(provider.name, {
      name: provider.name,
      version: provider.version,
      capabilities,
      isActive: true,
    });

    this.logger.log(
      `Registered provider: ${provider.name} v${provider.version}`
    );
  }

  unregister(providerName: string): void {
    this.providers.delete(providerName);
    this.metadata.delete(providerName);
    this.logger.log(`Unregistered provider: ${providerName}`);
  }

  getProvider<T extends IProvider>(providerName: string): T {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new ProviderError(`Provider ${providerName} not found`);
    }
    return provider as T;
  }

  getProvidersByCapability(capability: ProviderCapability): IProvider[] {
    const result: IProvider[] = [];
    for (const [name, meta] of this.metadata.entries()) {
      if (meta.capabilities.includes(capability) && meta.isActive) {
        const provider = this.providers.get(name);
        if (provider) result.push(provider);
      }
    }
    return result;
  }

  getAllProviders(): ProviderMetadata[] {
    return Array.from(this.metadata.values());
  }

  hasProvider(providerName: string): boolean {
    return this.providers.has(providerName);
  }

  setProviderActive(providerName: string, isActive: boolean): void {
    const meta = this.metadata.get(providerName);
    if (meta) {
      meta.isActive = isActive;
      this.logger.log(
        `Provider ${providerName} ${isActive ? "activated" : "deactivated"}`
      );
    }
  }

  async healthCheckAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    for (const [name, provider] of this.providers.entries()) {
      try {
        const isHealthy = await provider.healthCheck();
        results.set(name, isHealthy);
      } catch (error) {
        results.set(name, false);
        this.logger.error(`Health check failed for ${name}:`, error);
      }
    }
    return results;
  }
}
