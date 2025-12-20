import IUpstoxResponse from "../general";

export interface IGetProfileUpstox {
  email: string;
  exchanges: Array<
    "NSE" | "NFO" | "BSE" | "CDS" | "BFO" | "BCD" | "MCX" | "NSCOM"
  >;
  products: Array<"D" | "CO" | "I" | "MTF">;
  broker: "UPSTOX";
  user_id: string;
  user_name: string;
  order_types: Array<"MARKET" | "LIMIT" | "SL" | "SL-M">;
  user_type: "individual";
  poa: false;
  ddpi: false;
  is_active: true;
}

export default interface IGetProfileUpstoxResponse extends IUpstoxResponse<IGetProfileUpstox> {}
