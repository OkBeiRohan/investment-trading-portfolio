import {
  betterAuth,
  BetterAuthOptions,
  GenericEndpointContext,
  User,
} from "better-auth";
import { DBAdapter } from "@better-auth/core/db/adapter";
import {
  anonymous,
  magicLink,
  organization,
  phoneNumber,
  twoFactor,
  UserWithTwoFactor,
} from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";

export interface BetterAuthServerConfig {
  adapter: (options: BetterAuthOptions) => DBAdapter;
  options: BetterAuthOptions;
  emailProvider?: {
    sendVerificationEmail: (data: {
      user: User;
      url: string;
      token: string;
    }) => Promise<void>;
    sendResetPasswordEmail?: (data: {
      user: User;
      url: string;
      token: string;
    }) => Promise<void>;
  };
  phoneNumberProvider?: {
    sendOTP: (data: { phoneNumber: string; code: string }) => Promise<void>;
  };
  organizationConfig?: {
    sendInvitationEmail: (data: {
      email: string;
      organizationName: string;
      inviterName: string;
      invitationLink: string;
      role: string;
    }) => Promise<void>;
  };
  twoFactorConfig?: {
    sendOTP?: (
      data: {
        user: UserWithTwoFactor;
        otp: string;
      },
      context?: GenericEndpointContext
    ) => Promise<void>;
  };
}

export function createBetterAuthInstance(config: BetterAuthServerConfig) {
  return betterAuth({
    database: config.adapter,
    ...config.options,

    // Advanced options for cross-origin support
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
      },
      useSecureCookies: process.env.NODE_ENV === "production",
    },

    // Email and password authentication
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: config.emailProvider?.sendResetPasswordEmail,
    },
    emailVerification: {
      async sendVerificationEmail(data) {
        if (config.emailProvider?.sendVerificationEmail) {
          await config.emailProvider.sendVerificationEmail(data);
        }
      },
    },

    // User configuration
    user: {
      ...config.options.user,
      changeEmail: {
        enabled: true,
        sendChangeEmailVerification: async (data) => {
          if (config.emailProvider?.sendVerificationEmail) {
            await config.emailProvider.sendVerificationEmail(data);
          }
        },
      },
    },

    hooks: {},

    // Plugins
    plugins: [
      anonymous(),
      // Phone number verification plugin
      phoneNumber({
        async sendOTP(data) {
          if (config.phoneNumberProvider?.sendOTP) {
            await config.phoneNumberProvider.sendOTP(data);
          }
        },
      }),

      // Organization plugin for multi-tenancy
      organization({
        async sendInvitationEmail(data) {
          if (config.organizationConfig?.sendInvitationEmail) {
            await config.organizationConfig.sendInvitationEmail({
              email: data.email,
              organizationName: data.organization.name,
              inviterName: data.inviter.user.name,
              invitationLink: `${config.options.baseURL}/accept-invitation/${data.id}`,
              role: data.role,
            });
          }
        },
        creatorRole: "owner",
        allowUserToCreateOrganization: true,
        organizationLimit: 10,
        teams: { enabled: true, defaultTeam: { enabled: true } },
      }),

      // Two-factor authentication plugin
      twoFactor({
        issuer: config.options.appName,
        otpOptions: config.twoFactorConfig?.sendOTP
          ? {
              async sendOTP(data, context) {
                if (config.twoFactorConfig?.sendOTP) {
                  await config.twoFactorConfig.sendOTP(data, context);
                }
              },
            }
          : undefined,
      }),

      // Passkey plugin for WebAuthn/FIDO2
      passkey({
        rpID: new URL(config.options.baseURL || "").hostname,
        rpName: config.options.appName,
        origin: config.options.baseURL,
        authenticatorSelection: {
          authenticatorAttachment: undefined, // Allow both platform and cross-platform
          requireResidentKey: false,
          residentKey: "preferred",
          userVerification: "preferred",
        },
      }),

      magicLink({
        sendMagicLink: function (
          data: { email: string; url: string; token: string },
          ctx?: GenericEndpointContext | undefined
        ): Promise<void> | void {
          throw new Error("Function not implemented.");
        },
      }),
    ],
  });
}
