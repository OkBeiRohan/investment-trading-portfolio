import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { IProvider } from './provider.interface';

/**
 * Provider Registry - Manages provider lifecycle and discovery
 * 
 * @example
 * ```typescript
 * registry.register('upstox', upstoxProvider);
 * const provider = registry.get('upstox');
 * const all = registry.getAll();
 * ```
 */
@Injectable()
export class ProviderRegistry implements OnModuleInit {
  private readonly logger = new Logger(ProviderRegistry.name);
  private readonly providers = new Map<string, IProvider>();

  async onModuleInit() {
    this.logger.log('Provider registry initialized');
  }

  /**
   * Register a provider instance
   */
  register(name: string, provider: IProvider): void {
    if (this.providers.has(name)) {
      this.logger.warn(`Provider '${name}' already registered, overwriting`);
    }

    this.providers.set(name, provider);
    this.logger.log(`Registered provider: ${name} (v${provider.version})`);
  }

  /**
   * Get a provider by name
   */
  get(name: string): IProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Check if provider is registered
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Get all registered providers
   */
  getAll(): IProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider names
   */
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Unregister a provider
   */
  unregister(name: string): boolean {
    const removed = this.providers.delete(name);
    if (removed) {
      this.logger.log(`Unregistered provider: ${name}`);
    }
    return removed;
  }

  /**
   * Health check all providers
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [name, provider] of this.providers) {
      try {
        const healthy = await provider.healthCheck();
        results.set(name, healthy);
      } catch (error) {
        this.logger.error(`Health check failed for ${name}:`, error);
        results.set(name, false);
      }
    }

    return results;
  }
}

