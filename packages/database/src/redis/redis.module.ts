import { Module, Global, DynamicModule } from "@nestjs/common";
import { Redis } from "ioredis";

export const REDIS_CLIENT = "REDIS_CLIENT";

export interface RedisModuleOptions {
  url: string;
}

/**
 * Default Redis provider that self-initializes from REDIS_URL env var.
 * This allows `import RedisModule` (without forRoot) to work correctly,
 * mirroring the MongoDBModule pattern.
 */
const defaultRedisProvider = {
  provide: REDIS_CLIENT,
  useFactory: () => {
    return new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });
  },
};

@Global()
@Module({
  providers: [defaultRedisProvider],
  exports: [defaultRedisProvider],
})
export class RedisModule {
  /**
   * Dynamic initialization with explicit options.
   * Use this when you need to pass a custom Redis URL at module level.
   */
  static forRoot(options: RedisModuleOptions): DynamicModule {
    const redisProvider = {
      provide: REDIS_CLIENT,
      useFactory: () => {
        return new Redis(options.url, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: false,
        });
      },
    };

    return {
      module: RedisModule,
      providers: [redisProvider],
      exports: [redisProvider],
    };
  }
}

