import { ISegmentFundMargin } from "../api/upstox/profile/get-fund-margin";
import { BrokerExchange, BrokerProduct, BrokerOrderType } from "./broker-enums";

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

  /** Products - Normalized across all brokers */
  products: BrokerProduct[];

  /** Order Types - Normalized across all brokers */
  orderTypes: BrokerOrderType[];

  /** Exchanges - Normalized across all brokers */
  exchanges: BrokerExchange[];

  /** Fund and Margin from /v2/user/get-funds-and-margin */
  fundMargin: IBrokerAccountFundMargin;

  /** Record creation timestamp */
  createdAt: Date;

  /** Record last update timestamp */
  updatedAt: Date;

  /** Last sync timestamp with broker API */
  lastSyncAt: Date;
}
