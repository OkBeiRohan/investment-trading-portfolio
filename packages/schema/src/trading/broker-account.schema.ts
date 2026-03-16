import { ISegmentFundMargin } from "../api/upstox/profile/get-fund-margin";
import { BrokerExchange, BrokerProduct, BrokerOrderType, BrokerSegment } from "./broker-enums";

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

  // ─── Upstox Re-Auth Tracking ──────────────────────────────────────────

  /**
   * Timestamp of the last successful Phase 2 daily re-authentication.
   * The actual access token lives in better-auth's accounts collection.
   */
  lastReAuthAt?: Date;

  // ─── Trading Controls (user + admin settable) ─────────────────────────

  /**
   * Whether the user has enabled live trading for this account.
   * User can toggle this themselves. Defaults to false (read-only data collection mode).
   */
  hasTradingEnabled: boolean;

  /**
   * Which trading segments are enabled for this account.
   * Subset of segments returned by Upstox profile (user cannot enable segments
   * they don't have; admin/user can disable specific segments).
   * e.g. ["EQ", "FO", "COM"]
   */
  tradingSegments: BrokerSegment[];

  /**
   * Admin-controlled flag: whether this account's token is included in the
   * market-feeder live data collection pool.
   * Only Admin users can set this to true.
   */
  isDataCollectionEnabled: boolean;

  /** Record creation timestamp */
  createdAt: Date;

  /** Record last update timestamp */
  updatedAt: Date;

  /** Last sync timestamp with broker API */
  lastSyncAt: Date;
}
