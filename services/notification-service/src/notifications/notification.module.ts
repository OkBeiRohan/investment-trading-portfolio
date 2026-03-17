import { Module } from "@nestjs/common";
import { DatabaseModule } from "@repo/database";
import { NotificationService } from "./notification.service";
import { NotificationListener } from "./notification.listener";
import { EmailChannel } from "./channels/email.channel";

@Module({
  imports: [DatabaseModule.forMongoDB()],
  providers: [NotificationService, NotificationListener, EmailChannel],
  exports: [NotificationService],
})
export class NotificationModule {}
