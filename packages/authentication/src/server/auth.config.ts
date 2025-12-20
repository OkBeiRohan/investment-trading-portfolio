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
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { createAuthConfig } from "src/config/auth.config";
import IGetProfileUpstoxResponse, {
  IGetProfileUpstox,
} from "@repo/schema/api/upstox/profile/get-profile";
import {
  IGetFundMarginUpstoxResponse,
  IGetFundMarginUpstox,
} from "@repo/schema/api/upstox/profile/get-fund-margin";
import { isUpstoxSuccess, extractUpstoxData } from "@repo/schema";
import type { BrokerAccountRepository } from "@repo/database";

export interface BetterAuthServerConfig {
  adapter: (options: BetterAuthOptions) => DBAdapter;
  options: ReturnType<typeof createAuthConfig>;
  brokerAccountRepository?: BrokerAccountRepository;
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
    // Hook to store Upstox data after account linking
    hooks: {
      after: [
        {
          matcher: (ctx) => ctx.path === "/link-account",
          handler: async (ctx) => {
            const account = ctx.context.account;
            const user = ctx.context.user;

            if (
              account?.providerId === "upstox" &&
              config.brokerAccountRepository &&
              account.accessToken
            ) {
              try {
                // Fetch profile
                const profileResponse = await fetch(
                  "https://api.upstox.com/v2/user/profile",
                  {
                    headers: {
                      Authorization: `Bearer ${account.accessToken}`,
                      Accept: "application/json",
                    },
                  }
                );

                if (!profileResponse.ok) {
                  console.error(
                    "Failed to fetch Upstox profile after account link"
                  );
                  return;
                }

                const profileData =
                  (await profileResponse.json()) as IGetProfileUpstoxResponse;
                const profile =
                  extractUpstoxData<IGetProfileUpstox>(profileData);

                // Fetch fund and margin
                const fundResponse = await fetch(
                  "https://api.upstox.com/v2/user/get-funds-and-margin",
                  {
                    headers: {
                      Authorization: `Bearer ${account.accessToken}`,
                      Accept: "application/json",
                    },
                  }
                );

                const fundData = fundResponse.ok
                  ? ((await fundResponse.json()) as IGetFundMarginUpstoxResponse)
                  : null;

                const fundMargin = fundData
                  ? extractUpstoxData<IGetFundMarginUpstox>(fundData)
                  : null;

                // Store in Trading database
                await config.brokerAccountRepository.updateByUserIdAndProvider(
                  user.id,
                  "upstox",
                  {
                    userId: user.id,
                    authAccountId: account.id,
                    providerId: "upstox",
                    profile: {
                      userId: profile.user_id,
                      userName: profile.user_name,
                      userType: profile.user_type,
                      email: profile.email,
                      poa: profile.poa,
                    },
                    broker: profile.broker,
                    products: profile.products,
                    orderTypes: profile.order_types,
                    exchanges: profile.exchanges,
                    fundMargin: fundMargin
                      ? {
                          equity: {
                            usedMargin: fundMargin.equity.used_margin,
                            payinAmount: fundMargin.equity.payin_amount,
                            spanMargin: fundMargin.equity.span_margin,
                            adhocMargin: fundMargin.equity.adhoc_margin,
                            notionalCash: fundMargin.equity.notional_cash,
                            availableMargin: fundMargin.equity.available_margin,
                            exposureMargin: fundMargin.equity.exposure_margin,
                          },
                          commodity: {
                            usedMargin: fundMargin.commodity.used_margin,
                            payinAmount: fundMargin.commodity.payin_amount,
                            spanMargin: fundMargin.commodity.span_margin,
                            adhocMargin: fundMargin.commodity.adhoc_margin,
                            notionalCash: fundMargin.commodity.notional_cash,
                            availableMargin:
                              fundMargin.commodity.available_margin,
                            exposureMargin:
                              fundMargin.commodity.exposure_margin,
                            optionPremium: fundMargin.commodity.option_premium,
                            assignmentMargin:
                              fundMargin.commodity.assignment_margin,
                            witholdingAmount:
                              fundMargin.commodity.witholding_amount,
                            intraDayPayin: fundMargin.commodity.intra_day_payin,
                          },
                        }
                      : {
                          equity: {
                            usedMargin: 0,
                            payinAmount: 0,
                            spanMargin: 0,
                            adhocMargin: 0,
                            notionalCash: 0,
                            availableMargin: 0,
                            exposureMargin: 0,
                          },
                          commodity: {
                            usedMargin: 0,
                            payinAmount: 0,
                            spanMargin: 0,
                            adhocMargin: 0,
                            notionalCash: 0,
                            availableMargin: 0,
                            exposureMargin: 0,
                            optionPremium: 0,
                            assignmentMargin: 0,
                            witholdingAmount: 0,
                            intraDayPayin: 0,
                          },
                        },
                    lastSyncAt: new Date(),
                  } as any
                );

                console.log(
                  `Upstox profile and fund margin stored for user ${user.id}`
                );
              } catch (error) {
                console.error(
                  "Error storing Upstox data in Trading database:",
                  error
                );
              }
            }
          },
        },
      ],
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

      // Upstox OAuth for broker account linking
      ...(config.options.brokerProviders?.upstox
        ? [
            genericOAuth({
              config: [
                {
                  providerId: "upstox",
                  clientId: config.options.brokerProviders.upstox.clientId,
                  clientSecret:
                    config.options.brokerProviders.upstox.clientSecret,
                  authorizationUrl:
                    "https://api.upstox.com/v2/login/authorization/dialog",
                  tokenUrl:
                    "https://api.upstox.com/v2/login/authorization/token",
                  userInfoUrl: "https://api.upstox.com/v2/user/profile",
                  // Upstox OAuth v2 does not expose granular per-request scopes.
                  // The effective permissions of the access token are defined in the
                  // Upstox developer console for this application (e.g. trading +
                  // read-only APIs). Passing `undefined` here ensures no explicit
                  // `scope` parameter is sent, and makes the implicit default
                  // permission model explicit for SEBI/audit documentation.
                  scopes: undefined,
                  pkce: false, // Upstox uses client_secret
                  responseType: "code",
                  authentication: "post", // Standard OAuth2 POST request
                  // Map Upstox profile response to better-auth user format
                  getUserInfo: async (tokens) => {
                    const response = await fetch(
                      "https://api.upstox.com/v2/user/profile",
                      {
                        headers: {
                          Authorization: `Bearer ${tokens.accessToken}`,
                          Accept: "application/json",
                        },
                      }
                    );

                    if (!response.ok) {
                      throw new Error(
                        "Failed to fetch user profile from Upstox"
                      );
                    }

                    const responseData =
                      (await response.json()) as IGetProfileUpstoxResponse;

                    if (isUpstoxSuccess<IGetProfileUpstox>(responseData)) {
                      return {
                        id: responseData.data.user_id,
                        name: responseData.data.user_name,
                        email: responseData.data.email,
                        emailVerified: true, // Upstox emails are verified
                      };
                    }

                    console.log(
                      "Invalid Upstox profile response",
                      responseData
                    );

                    throw new Error(
                      "Invalid profile data received from Upstox",
                      { cause: responseData }
                    );
                  },
                },
              ],
            }),
          ]
        : []),
    ],
  });
}
