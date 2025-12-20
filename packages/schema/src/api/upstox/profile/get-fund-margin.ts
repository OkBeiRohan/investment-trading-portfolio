import IUpstoxResponse from "../general";

/**
 * Upstox Get User Fund and Margin API Response
 * https://upstox.com/developer/api-documentation/get-user-fund-margin
 */

export interface IEquitySegment {
  used_margin: number;
  payin_amount: number;
  span_margin: number;
  adhoc_margin: number;
  notional_cash: number;
  available_margin: number;
  exposure_margin: number;
}

export interface ICommoditySegment {
  used_margin: number;
  payin_amount: number;
  span_margin: number;
  adhoc_margin: number;
  notional_cash: number;
  available_margin: number;
  exposure_margin: number;
  option_premium: number;
  assignment_margin: number;
  witholding_amount: number;
  intra_day_payin: number;
}

export interface IGetFundMarginUpstox {
  equity: IEquitySegment;
  commodity: ICommoditySegment;
}

export type IGetFundMarginUpstoxResponse =
  IUpstoxResponse<IGetFundMarginUpstox>;
