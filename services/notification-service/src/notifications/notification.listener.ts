import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { NotificationService } from "./notification.service";

@Injectable()
export class NotificationListener implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationListener.name);
  private subscriber: Redis | null = null;

  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    this.subscriber = new Redis(redisUrl);

    this.subscriber.subscribe("notification.send", (err) => {
      if (err) {
        this.logger.error(`Failed to subscribe to notification.send: ${err.message}`);
        return;
      }
      this.logger.log("Subscribed to notification.send Redis channel");
    });

    this.subscriber.on("message", async (_channel: string, message: string) => {
      try {
        const payload = JSON.parse(message);
        await this.notificationService.sendNotification(payload);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to process notification message: ${msg}`);
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.unsubscribe("notification.send");
      await this.subscriber.quit();
    }
  }
}
