import { Injectable, Logger } from "@nestjs/common";
import { DbConfigService, AuditLogRepository } from "@repo/database";
import { EmailChannel, type EmailPayload } from "./channels/email.channel";

export interface NotificationPayload {
  type: "daily-reauth" | "trading-alert" | "system";
  userId: string;
  recipientEmail: string;
  recipientName: string;
  data: Record<string, string>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly emailChannel: EmailChannel,
    private readonly dbConfig: DbConfigService,
    private readonly auditLogRepo: AuditLogRepository,
  ) { }

  async sendNotification(payload: NotificationPayload): Promise<boolean> {
    const config = await this.dbConfig.getNotificationConfig();

    if (config.emailEnabled) {
      const email = await this.buildEmail(payload, config);
      const sent = await this.emailChannel.send(email);

      await this.auditLogRepo.create({
        action: `notification.${payload.type}.${sent ? "sent" : "failed"}`,
        category: "system",
        userId: payload.userId,
        details: {
          channel: "email",
          to: payload.recipientEmail,
          type: payload.type,
        },
      });

      return sent;
    }

    this.logger.warn(
      `No notification channel enabled for ${payload.type} to ${payload.recipientEmail}`,
    );
    return false;
  }

  async sendDailyReAuthNotification(
    userId: string,
    email: string,
    name: string,
    reAuthUrl: string,
  ): Promise<boolean> {
    return this.sendNotification({
      type: "daily-reauth",
      userId,
      recipientEmail: email,
      recipientName: name,
      data: { reAuthUrl, name },
    });
  }

  private async buildEmail(
    payload: NotificationPayload,
    config: { dailyReAuthTemplateSubject: string; dailyReAuthTemplateBody: string },
  ): Promise<EmailPayload> {
    let subject: string;
    let body: string;

    switch (payload.type) {
      case "daily-reauth":
        subject = this.interpolate(
          config.dailyReAuthTemplateSubject,
          payload.data,
        );
        body = this.interpolate(
          config.dailyReAuthTemplateBody,
          payload.data,
        );
        break;
      default:
        subject = `[Trading Platform] ${payload.type}`;
        body = JSON.stringify(payload.data);
    }

    return {
      to: payload.recipientEmail,
      subject,
      html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Trading Platform</h2>
        <div style="padding: 20px 0;">${body}</div>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">This is an automated message from your trading platform.</p>
      </div>`,
      text: body.replace(/<[^>]*>/g, ""),
    };
  }

  private interpolate(
    template: string,
    data: Record<string, string>,
  ): string {
    return template.replace(
      /\{\{(\w+)\}\}/g,
      (_, key) => data[key] || `{{${key}}}`,
    );
  }
}
