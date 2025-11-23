import { Module, Global, DynamicModule } from "@nestjs/common";
import { Redis } from "ioredis";

export const REDIS_CLIENT = "REDIS_CLIENT";

export interface RedisModuleOptions {
  url: string;
}

@Global()
@Module({})
export class RedisModule {
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
