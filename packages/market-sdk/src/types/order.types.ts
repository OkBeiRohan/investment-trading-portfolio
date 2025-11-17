/**
 * Order and Trade Types
 */

import {
  OrderStatus,
  OrderType,
  ProductType,
  TransactionType,
  Validity,
} from "./common.types";

export interface PlaceOrderRequest {
  instrumentKey: string;
  quantity: number;
  price: number;
  transactionType: TransactionType;
  orderType: OrderType;
  product: ProductType;
  validity: Validity;
  disclosedQuantity?: number;
  triggerPrice?: number;
  isAmo?: boolean; // After Market Order
}

export interface PlaceOrderResponse {
  orderId: string;
  status: OrderStatus;
  message?: string;
}

export interface ModifyOrderRequest {
  orderId: string;
  quantity?: number;
  price?: number;
  orderType?: OrderType;
  validity?: Validity;
  disclosedQuantity?: number;
  triggerPrice?: number;
}

export interface CancelOrderRequest {
  orderId: string;
}

export interface OrderDetails {
  orderId: string;
  parentOrderId?: string;
  exchangeOrderId?: string;
  placedBy: string;
  tradingSymbol: string;
  instrumentKey: string;
  exchange: string;
  orderType: OrderType;
  transactionType: TransactionType;
  product: ProductType;
  validity: Validity;
  price: number;
  triggerPrice?: number;
  quantity: number;
  disclosedQuantity: number;
  filledQuantity: number;
  pendingQuantity: number;
  averagePrice: number;
  orderTimestamp: Date;
  exchangeTimestamp?: Date;
  status: OrderStatus;
  statusMessage?: string;
  statusMessageRaw?: string;
  isAmo: boolean;
  tag?: string;
}

export interface Trade {
  tradeId: string;
  orderId: string;
  exchangeOrderId: string;
  instrumentKey: string;
  tradingSymbol: string;
  exchange: string;
  transactionType: TransactionType;
  product: ProductType;
  quantity: number;
  price: number;
  tradeTimestamp: Date;
}

export interface MultiLegOrder {
  legs: PlaceOrderRequest[];
  tag?: string;
}

export interface MultiLegOrderResponse {
  orderId: string;
  legs: Array<{
    legId: string;
    orderId: string;
    status: OrderStatus;
  }>;
}
