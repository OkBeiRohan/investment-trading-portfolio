import { Injectable, Inject } from "@nestjs/common";
import { Redis } from "ioredis";
import { REDIS_CLIENT } from "../redis.module";
import { ISession } from "@repo/schema";

@Injectable()
export class SessionCacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private getKey(token: string): string {
    return `session:${token}`;
  }

  async set(
    token: string,
    session: ISession,
    ttlSeconds: number
  ): Promise<void> {
    const key = this.getKey(token);
    await this.redis.setex(key, ttlSeconds, JSON.stringify(session));
  }

  async get(token: string): Promise<ISession | null> {
    const key = this.getKey(token);
    const data = await this.redis.get(key);

    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async delete(token: string): Promise<void> {
    const key = this.getKey(token);
    await this.redis.del(key);
  }

  async exists(token: string): Promise<boolean> {
    const key = this.getKey(token);
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  async updateTTL(token: string, ttlSeconds: number): Promise<void> {
    const key = this.getKey(token);
    await this.redis.expire(key, ttlSeconds);
  }
}
