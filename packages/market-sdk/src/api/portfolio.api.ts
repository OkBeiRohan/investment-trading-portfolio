/**
 * Portfolio API Module
 * Handles positions, holdings, and funds
 */

import UpstoxClient from "upstox-js-sdk";
import type { Position, Holding, Funds, PortfolioSummary } from "../types";

export class PortfolioApi {
  private apiClient: typeof UpstoxClient.ApiClient;
  private portfolioApi: UpstoxClient.PortfolioApi;

  constructor(apiClient: typeof UpstoxClient.ApiClient) {
    this.apiClient = apiClient;
    this.portfolioApi = new UpstoxClient.PortfolioApi();
  }

  /**
   * Get all positions
   */
  async getPositions(): Promise<Position[]> {
    return new Promise((resolve, reject) => {
      this.portfolioApi.getPositions(
        "2.0",
        (error: any, data: any, response: any) => {
          if (error) {
            reject(this.parseError(error));
          } else {
            const positions = (data.data || []).map((pos: any) =>
              this.mapPosition(pos)
            );
            resolve(positions);
          }
        }
      );
    });
  }

  /**
   * Get all holdings
   */
  async getHoldings(): Promise<Holding[]> {
    return new Promise((resolve, reject) => {
      this.portfolioApi.getHoldings(
        "2.0",
        (error: any, data: any, response: any) => {
          if (error) {
            reject(this.parseError(error));
          } else {
            const holdings = (data.data || []).map((hold: any) =>
              this.mapHolding(hold)
            );
            resolve(holdings);
          }
        }
      );
    });
  }

  /**
   * Get fund and margin details
   */
  async getFunds(): Promise<Funds> {
    return new Promise((resolve, reject) => {
      this.portfolioApi.getUserFundMargin(
        "2.0",
        undefined,
        (error: any, data: any, response: any) => {
          if (error) {
            reject(this.parseError(error));
          } else {
            resolve(this.mapFunds(data.data));
          }
        }
      );
    });
  }

  /**
   * Get complete portfolio summary
   */
  async getPortfolioSummary(): Promise<PortfolioSummary> {
    const [positions, holdings, funds] = await Promise.all([
      this.getPositions(),
      this.getHoldings(),
      this.getFunds(),
    ]);

    const totalPnl =
      positions.reduce((sum, pos) => sum + pos.pnl, 0) +
      holdings.reduce((sum, hold) => sum + hold.pnl, 0);

    const totalInvestment = holdings.reduce(
      (sum, hold) => sum + hold.averagePrice * hold.quantity,
      0
    );

    const totalValue = holdings.reduce(
      (sum, hold) => sum + hold.lastPrice * hold.quantity,
      0
    );

    const dayPnl =
      positions.reduce((sum, pos) => sum + pos.dayChange, 0) +
      holdings.reduce((sum, hold) => sum + hold.dayChange, 0);

    const dayPnlPercentage = totalValue > 0 ? (dayPnl / totalValue) * 100 : 0;

    return {
      totalPnl,
      totalInvestment,
      totalValue,
      dayPnl,
      dayPnlPercentage,
      positions,
      holdings,
      funds,
    };
  }

  /**
   * Convert position to bracket order
   */
  async convertPosition(
    instrumentKey: string,
    transactionType: string,
    quantity: number,
    oldProduct: string,
    newProduct: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const convertPositionRequest = new UpstoxClient.ConvertPositionRequest(
        instrumentKey,
        quantity,
        transactionType,
        oldProduct,
        newProduct
      );

      this.portfolioApi.convertPositions(
        "2.0",
        convertPositionRequest,
        (error: any, data: any, response: any) => {
          if (error) {
            reject(this.parseError(error));
          } else {
            resolve();
          }
        }
      );
    });
  }

  private mapPosition(data: any): Position {
    return {
      instrumentKey: data.instrument_token,
      tradingSymbol: data.trading_symbol,
      exchange: data.exchange,
      product: data.product,
      quantity: parseInt(data.quantity),
      averagePrice: parseFloat(data.average_price),
      lastPrice: parseFloat(data.last_price),
      closePrice: parseFloat(data.close_price),
      pnl: parseFloat(data.pnl),
      dayChange: parseFloat(data.day_change),
      dayChangePercentage: parseFloat(data.day_change_percentage),
      buyQuantity: parseInt(data.buy_quantity),
      buyAmount: parseFloat(data.buy_amount),
      buyAverage: parseFloat(data.buy_average),
      sellQuantity: parseInt(data.sell_quantity),
      sellAmount: parseFloat(data.sell_amount),
      sellAverage: parseFloat(data.sell_average),
      multiplier: parseFloat(data.multiplier),
      overnightQuantity: data.overnight_quantity
        ? parseInt(data.overnight_quantity)
        : undefined,
      dayBuyQuantity: data.day_buy_quantity
        ? parseInt(data.day_buy_quantity)
        : undefined,
      daySellQuantity: data.day_sell_quantity
        ? parseInt(data.day_sell_quantity)
        : undefined,
    };
  }

  private mapHolding(data: any): Holding {
    return {
      instrumentKey: data.instrument_token,
      tradingSymbol: data.trading_symbol,
      exchange: data.exchange,
      isin: data.isin,
      quantity: parseInt(data.quantity),
      t1Quantity: parseInt(data.t1_quantity),
      averagePrice: parseFloat(data.average_price),
      lastPrice: parseFloat(data.last_price),
      closePrice: parseFloat(data.close_price),
      pnl: parseFloat(data.pnl),
      dayChange: parseFloat(data.day_change),
      dayChangePercentage: parseFloat(data.day_change_percentage),
      collateralQuantity: data.collateral_quantity
        ? parseInt(data.collateral_quantity)
        : undefined,
      collateralType: data.collateral_type,
    };
  }

  private mapFunds(data: any): Funds {
    return {
      availableMargin: parseFloat(data.available_margin),
      usedMargin: parseFloat(data.used_margin),
      cashBalance: parseFloat(data.cash_balance),
      collateralMargin: parseFloat(data.collateral_margin),
      intradayPayin: parseFloat(data.intraday_payin),
      adhocMargin: parseFloat(data.adhoc_margin),
      notionalCash: parseFloat(data.notional_cash),
    };
  }

  private parseError(error: any): Error {
    if (error.response && error.response.text) {
      try {
        const errorData = JSON.parse(error.response.text);
        const errorMessage =
          errorData.errors?.[0]?.message ||
          errorData.message ||
          "Unknown error";
        return new Error(errorMessage);
      } catch {
        return new Error(error.response.text);
      }
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
