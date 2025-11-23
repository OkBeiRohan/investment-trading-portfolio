import { betterAuth } from "better-auth";
import { mongoAdapter, Repositories } from "../adapters/mongodb.adapter";
import { DBAdapter } from "@better-auth/core/db/adapter";

export interface BetterAuthServerConfig {
  adapter: (options?: any) => DBAdapter;
  baseURL: string;
  secret: string;
  appName: string;
  trustedOrigins?: string[];
  emailProvider?: {
    sendVerificationEmail: (data: {
      email: string;
      url: string;
      token: string;
    }) => Promise<void>;
    sendResetPasswordEmail?: (data: {
      email: string;
      url: string;
      token: string;
    }) => Promise<void>;
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
      data: { user: any; otp: string },
      request?: Request
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
      async sendVerificationEmail({ user, url, token }) {
        if (config.emailProvider?.sendVerificationEmail) {
          await config.emailProvider.sendVerificationEmail({
            email: user.email,
            url,
            token,
          });
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
        banned: {
          type: "boolean",
          defaultValue: false,
          input: false,
        },
        banReason: {
          type: "string",
          required: false,
          input: false,
        },
        banExpires: {
          type: "date",
          required: false,
          input: false,
        },
      },
      changeEmail: {
        enabled: true,
        sendChangeEmailVerification: async ({ newEmail, url, token }) => {
          if (config.emailProvider?.sendVerificationEmail) {
            await config.emailProvider.sendVerificationEmail({
              email: newEmail,
              url,
              token,
            });
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
            scopes: ["openid", "email", "profile"],
          }
        : undefined,
      github: config.socialProviders?.github
        ? {
            clientId: config.socialProviders.github.clientId,
            clientSecret: config.socialProviders.github.clientSecret,
            scopes: ["user:email"],
          }
        : undefined,
      discord: config.socialProviders?.discord
        ? {
            clientId: config.socialProviders.discord.clientId,
            clientSecret: config.socialProviders.discord.clientSecret,
            scopes: ["identify", "email"],
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
              async sendOTP(data, request) {
                if (config.twoFactorConfig?.sendOTP) {
                  await config.twoFactorConfig.sendOTP(data, request);
                }
              },
              // OTP will expire in 5 minutes
              expiresIn: 60 * 5,
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
        timeout: 60000, // 60 seconds
      }),
    ],
  });
}
export type Auth = ReturnType<typeof createAuth>;
