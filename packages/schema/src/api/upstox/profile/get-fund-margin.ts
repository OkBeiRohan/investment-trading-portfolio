import IUpstoxResponse from "../general";

/**
 * Upstox Get User Fund and Margin API Response
 * https://upstox.com/developer/api-documentation/get-user-fund-margin
 *
 * NOTE: From 19th July 2025, combined funds for both Equity and Commodity
 * segments will be returned in the `equity` object only.
 */

/**
 * Fund and Margin data for a trading segment (Equity or Commodity)
 * Both segments have identical structure as per Upstox API v2
 */
export interface ISegmentFundMargin {
  /** Amount blocked in open orders or positions (negative = released) */
  used_margin: number;
  /** Instant payin amount */
  payin_amount: number;
  /** Amount blocked on futures and options towards SPAN */
  span_margin: number;
  /** Payin amount credited through manual process */
  adhoc_margin: number;
  /** Amount maintained for withdrawal */
  notional_cash: number;
  /** Total margin available for trading */
  available_margin: number;
  /** Amount blocked on futures and options towards Exposure */
  exposure_margin: number;
}

export interface IGetFundMarginUpstox {
  equity: ISegmentFundMargin;
  commodity: ISegmentFundMargin;
}

export type IGetFundMarginUpstoxResponse =
  IUpstoxResponse<IGetFundMarginUpstox>;
