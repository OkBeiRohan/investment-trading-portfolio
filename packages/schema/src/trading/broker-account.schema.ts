import { ISegmentFundMargin } from "../api/upstox/profile/get-fund-margin";

/**
 * Trading Database - Broker Account Collection
 * Stores Upstox profile, fund margin, and account metadata
 */

export interface IBrokerAccountProfile {
  /** Upstox user_id */
  userId: string;
  /** Upstox user_name */
  userName: string;
  /** User type: "individual" or "corporate" */
  userType: string;
  /** User email address */
  email: string;
  /** Power of Attorney status */
  poa: boolean;
}

export interface IBrokerAccountFundMargin {
  equity: ISegmentFundMargin;
  commodity: ISegmentFundMargin;
}

export interface IBrokerAccount {
  /** Link to better-auth User ID */
  userId: string;

  /** Link to better-auth Account (OAuth account) ID */
  authAccountId: string;

  /** Provider identification (default: "upstox") */
  providerId: string;

  /** User Profile from /v2/user/profile */
  profile: IBrokerAccountProfile;

  /** Broker name (e.g., "UPSTOX") */
  broker: string;

  /** Products (e.g., ["D", "I"]) */
  products: string[];

  /** Order Types (e.g., ["MARKET", "LIMIT", "SL", "SL-M"]) */
  orderTypes: string[];

  /** Exchanges (e.g., ["NSE", "BSE", "NFO"]) */
  exchanges: string[];

  /** Fund and Margin from /v2/user/get-funds-and-margin */
  fundMargin: IBrokerAccountFundMargin;

  /** Record creation timestamp */
  createdAt: Date;

  /** Record last update timestamp */
  updatedAt: Date;

  /** Last sync timestamp with broker API */
  lastSyncAt: Date;
}
