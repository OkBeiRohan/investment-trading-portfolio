import { Injectable, Logger } from "@nestjs/common";
import { DbConfigService } from "@repo/database";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailChannel {
  private readonly logger = new Logger(EmailChannel.name);
  private transporter: Transporter | null = null;

  constructor(private readonly dbConfig: DbConfigService) {}

  async send(payload: EmailPayload): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();
      if (!transporter) {
        this.logger.warn("Email not configured; skipping send");
        return false;
      }

      const config = await this.dbConfig.getNotificationConfig();
      const result = await transporter.sendMail({
        from: await this.dbConfig.get("notification.emailFrom", "noreply@trading.local"),
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });

      this.logger.log(`Email sent to ${payload.to}: ${result.messageId}`);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email to ${payload.to}: ${msg}`);
      return false;
    }
  }

  private async getTransporter(): Promise<Transporter | null> {
    if (this.transporter) return this.transporter;

    const config = await this.dbConfig.getNotificationConfig();
    if (!config.emailEnabled) return null;

    const smtpHost = await this.dbConfig.get("notification.smtpHost", "");
    const smtpPort = await this.dbConfig.get("notification.smtpPort", 587);
    const smtpUser = process.env.SMTP_USER || "";
    const smtpPass = process.env.SMTP_PASS || "";

    if (!smtpHost) {
      this.logger.warn("SMTP host not configured");
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
    });

    return this.transporter;
  }
}
