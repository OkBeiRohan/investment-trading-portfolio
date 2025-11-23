import { betterAuth, GenericEndpointContext, User } from "better-auth";
import { mongoAdapter, Repositories } from "../adapters/mongodb.adapter";
import { DBAdapter } from "@better-auth/core/db/adapter";
import {
  organization,
  phoneNumber,
  twoFactor,
  UserWithTwoFactor,
} from "better-auth/plugins";
import { userRoleEnum } from "@repo/schema";
import { passkey } from "@better-auth/passkey";

export interface BetterAuthServerConfig {
  adapter: (options?: any) => DBAdapter;
  baseURL: string;
  secret: string;
  appName: string;
  trustedOrigins?: string[];
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
  socialProviders?: {
    google?: {
      clientId: string;
      clientSecret: string;
    };
    github?: {
      clientId: string;
      clientSecret: string;
    };
    discord?: {
      clientId: string;
      clientSecret: string;
    };
  };
  rateLimit?: {
    enabled: boolean;
    window: number;
    max: number;
  };
}

export function createBetterAuthInstance(config: BetterAuthServerConfig) {
  return betterAuth({
    database: config.adapter,

    baseURL: config.baseURL,
    secret: config.secret,
    appName: config.appName,

    // Trusted origins for CORS
    trustedOrigins: config.trustedOrigins || [],

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

    // Session configuration
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Update session every 24 hours
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5 minutes
      },
    },

    // User configuration
    user: {
      additionalFields: {
        // Add custom fields as needed
        dateOfBirth: {
          type: "string",
          required: false,
        },
        isActive: {
          type: "boolean",
          defaultValue: true,
          required: false,
          input: false,
        },
        isBlocked: {
          type: "boolean",
          defaultValue: false,
          required: false,
          input: false,
        },
        role: {
          type: "string[]",
          required: false,
          defaultValue: [userRoleEnum.enum.Investor],
          input: false,
        },
        lastLoginAt: {
          type: "date",
          required: false,
          input: false,
        },
        passwordChangedAt: {
          type: "date",
          required: false,
          input: false,
        },
      },
      changeEmail: {
        enabled: true,
        sendChangeEmailVerification: async (data) => {
          if (config.emailProvider?.sendVerificationEmail) {
            await config.emailProvider.sendVerificationEmail(data);
          }
        },
      },
    },

    // Account configuration
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google", "github"],
      },
    },

    // Social providers
    socialProviders: {
      google: config.socialProviders?.google
        ? {
            clientId: config.socialProviders.google.clientId,
            clientSecret: config.socialProviders.google.clientSecret,
            scope: ["openid", "email", "profile"],
          }
        : undefined,
      github: config.socialProviders?.github
        ? {
            clientId: config.socialProviders.github.clientId,
            clientSecret: config.socialProviders.github.clientSecret,
            scope: ["user:email"],
          }
        : undefined,
      discord: config.socialProviders?.discord
        ? {
            clientId: config.socialProviders.discord.clientId,
            clientSecret: config.socialProviders.discord.clientSecret,
            scope: ["identify", "email"],
          }
        : undefined,
    },

    // Rate limiting
    rateLimit: config.rateLimit?.enabled
      ? {
          window: config.rateLimit.window,
          max: config.rateLimit.max,
          storage: "memory", // Can be customized to use Redis
        }
      : undefined,

    // Advanced security
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      cookiePrefix: "better-auth",
      crossSubDomainCookies: {
        enabled: true,
      },
      generateId: () => {
        // Use MongoDB ObjectId-like generation
        return require("mongodb").ObjectId().toString();
      },
    },

    // Plugins
    plugins: [
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
              invitationLink: `${config.baseURL}/accept-invitation/${data.id}`,
              role: data.role,
            });
          }
        },
        creatorRole: "owner",
        allowUserToCreateOrganization: true,
        organizationLimit: 10,
      }),

      // Two-factor authentication plugin
      twoFactor({
        issuer: config.appName,
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
        rpID: new URL(config.baseURL).hostname,
        rpName: config.appName,
        origin: config.baseURL,
        authenticatorSelection: {
          authenticatorAttachment: undefined, // Allow both platform and cross-platform
          requireResidentKey: false,
          residentKey: "preferred",
          userVerification: "preferred",
        },
      }),
    ],
  });
}
