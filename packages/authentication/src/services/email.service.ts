import { Injectable } from "@nestjs/common";
import { User } from "better-auth";
import { UserWithTwoFactor } from "better-auth/plugins";

@Injectable()
export class EmailService {
  async sendVerificationEmail(data: {
    user: User;
    url: string;
    token: string;
  }) {
    console.log("📧 Verification email:", data.user.email);
    // TODO: Implement with SendGrid, AWS SES, etc.
  }

  async sendResetPasswordEmail(data: {
    user: User;
    url: string;
    token: string;
  }) {
    console.log("🔑 Reset password email:", data.user.email);
  }

  async sendInvitationEmail(data: {
    email: string;
    organizationName: string;
    inviterName: string;
    invitationLink: string;
    role: string;
  }) {
    console.log("📨 Invitation email:", data.email);
  }

  async sendOTP(data: { user: UserWithTwoFactor; otp: string }) {
    console.log("🔐 OTP email:", data.user.email);
  }
}
