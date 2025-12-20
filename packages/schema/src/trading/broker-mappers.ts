/**
 * Broker Type Mappers
 * Bidirectional mapping between broker-specific types and our generic types
 */

import {
  UpstoxExchange,
  UpstoxProduct,
  UpstoxOrderType,
} from "../api/upstox/profile/get-profile";
import { BrokerExchange, BrokerProduct, BrokerOrderType } from "./broker-enums";

/**
 * Upstox Exchange Mappers
 */
export const UpstoxExchangeMapper = {
  /**
   * Convert Upstox exchange to generic broker exchange
   */
  toGeneric(upstoxExchange: UpstoxExchange): BrokerExchange {
    const map: Record<UpstoxExchange, BrokerExchange> = {
      [UpstoxExchange.NSE]: BrokerExchange.NSE_EQUITY,
      [UpstoxExchange.NFO]: BrokerExchange.NSE_FO,
      [UpstoxExchange.BSE]: BrokerExchange.BSE_EQUITY,
      [UpstoxExchange.BFO]: BrokerExchange.BSE_FO,
      [UpstoxExchange.CDS]: BrokerExchange.CURRENCY_DERIVATIVES,
      [UpstoxExchange.BCD]: BrokerExchange.BSE_CURRENCY,
      [UpstoxExchange.MCX]: BrokerExchange.MCX_COMMODITY,
      [UpstoxExchange.NSCOM]: BrokerExchange.NSE_COMMODITY,
    };
    return map[upstoxExchange];
  },

  /**
   * Convert generic broker exchange to Upstox exchange
   */
  fromGeneric(brokerExchange: BrokerExchange): UpstoxExchange | null {
    const map: Partial<Record<BrokerExchange, UpstoxExchange>> = {
      [BrokerExchange.NSE_EQUITY]: UpstoxExchange.NSE,
      [BrokerExchange.NSE_FO]: UpstoxExchange.NFO,
      [BrokerExchange.BSE_EQUITY]: UpstoxExchange.BSE,
      [BrokerExchange.BSE_FO]: UpstoxExchange.BFO,
      [BrokerExchange.CURRENCY_DERIVATIVES]: UpstoxExchange.CDS,
      [BrokerExchange.BSE_CURRENCY]: UpstoxExchange.BCD,
      [BrokerExchange.MCX_COMMODITY]: UpstoxExchange.MCX,
      [BrokerExchange.NSE_COMMODITY]: UpstoxExchange.NSCOM,
    };
    return map[brokerExchange] ?? null;
  },

  /**
   * Convert array of Upstox exchanges to generic broker exchanges
   */
  arrayToGeneric(upstoxExchanges: UpstoxExchange[]): BrokerExchange[] {
    return upstoxExchanges.map(this.toGeneric);
  },

  /**
   * Convert array of generic broker exchanges to Upstox exchanges
   */
  arrayFromGeneric(brokerExchanges: BrokerExchange[]): UpstoxExchange[] {
    return brokerExchanges
      .map(this.fromGeneric)
      .filter((ex): ex is UpstoxExchange => ex !== null);
  },
};

/**
 * Upstox Product Mappers
 */
export const UpstoxProductMapper = {
  /**
   * Convert Upstox product to generic broker product
   */
  toGeneric(upstoxProduct: UpstoxProduct): BrokerProduct {
    const map: Record<UpstoxProduct, BrokerProduct> = {
      [UpstoxProduct.D]: BrokerProduct.DELIVERY,
      [UpstoxProduct.I]: BrokerProduct.INTRADAY,
      [UpstoxProduct.CO]: BrokerProduct.COVER_ORDER,
      [UpstoxProduct.MTF]: BrokerProduct.MARGIN,
    };
    return map[upstoxProduct];
  },

  /**
   * Convert generic broker product to Upstox product
   */
  fromGeneric(brokerProduct: BrokerProduct): UpstoxProduct | null {
    const map: Partial<Record<BrokerProduct, UpstoxProduct>> = {
      [BrokerProduct.DELIVERY]: UpstoxProduct.D,
      [BrokerProduct.INTRADAY]: UpstoxProduct.I,
      [BrokerProduct.COVER_ORDER]: UpstoxProduct.CO,
      [BrokerProduct.MARGIN]: UpstoxProduct.MTF,
      // BRACKET_ORDER not supported by Upstox
    };
    return map[brokerProduct] ?? null;
  },

  /**
   * Convert array of Upstox products to generic broker products
   */
  arrayToGeneric(upstoxProducts: UpstoxProduct[]): BrokerProduct[] {
    return upstoxProducts.map(this.toGeneric);
  },

  /**
   * Convert array of generic broker products to Upstox products
   */
  arrayFromGeneric(brokerProducts: BrokerProduct[]): UpstoxProduct[] {
    return brokerProducts
      .map(this.fromGeneric)
      .filter((prod): prod is UpstoxProduct => prod !== null);
  },
};

/**
 * Upstox Order Type Mappers
 */
export const UpstoxOrderTypeMapper = {
  /**
   * Convert Upstox order type to generic broker order type
   */
  toGeneric(upstoxOrderType: UpstoxOrderType): BrokerOrderType {
    const map: Record<UpstoxOrderType, BrokerOrderType> = {
      [UpstoxOrderType.MARKET]: BrokerOrderType.MARKET,
      [UpstoxOrderType.LIMIT]: BrokerOrderType.LIMIT,
      [UpstoxOrderType.SL]: BrokerOrderType.STOP_LOSS,
      [UpstoxOrderType.SL_M]: BrokerOrderType.STOP_LOSS_MARKET,
    };
    return map[upstoxOrderType];
  },

  /**
   * Convert generic broker order type to Upstox order type
   */
  fromGeneric(brokerOrderType: BrokerOrderType): UpstoxOrderType | null {
    const map: Partial<Record<BrokerOrderType, UpstoxOrderType>> = {
      [BrokerOrderType.MARKET]: UpstoxOrderType.MARKET,
      [BrokerOrderType.LIMIT]: UpstoxOrderType.LIMIT,
      [BrokerOrderType.STOP_LOSS]: UpstoxOrderType.SL,
      [BrokerOrderType.STOP_LOSS_MARKET]: UpstoxOrderType.SL_M,
      // AMO not directly mapped to Upstox enum
    };
    return map[brokerOrderType] ?? null;
  },

  /**
   * Convert array of Upstox order types to generic broker order types
   */
  arrayToGeneric(upstoxOrderTypes: UpstoxOrderType[]): BrokerOrderType[] {
    return upstoxOrderTypes.map(this.toGeneric);
  },

  /**
   * Convert array of generic broker order types to Upstox order types
   */
  arrayFromGeneric(brokerOrderTypes: BrokerOrderType[]): UpstoxOrderType[] {
    return brokerOrderTypes
      .map(this.fromGeneric)
      .filter((type): type is UpstoxOrderType => type !== null);
  },
};

/**
 * Complete Upstox Profile Mapper
 * Helper to convert entire Upstox profile data to generic broker account format
 */
export const UpstoxProfileMapper = {
  /**
   * Map Upstox profile exchanges, products, and order types to generic types
   */
  mapProfile(upstoxProfile: {
    exchanges: UpstoxExchange[];
    products: UpstoxProduct[];
    order_types: UpstoxOrderType[];
  }): {
    exchanges: BrokerExchange[];
    products: BrokerProduct[];
    orderTypes: BrokerOrderType[];
  } {
    return {
      exchanges: UpstoxExchangeMapper.arrayToGeneric(upstoxProfile.exchanges),
      products: UpstoxProductMapper.arrayToGeneric(upstoxProfile.products),
      orderTypes: UpstoxOrderTypeMapper.arrayToGeneric(
        upstoxProfile.order_types
      ),
    };
  },
};
