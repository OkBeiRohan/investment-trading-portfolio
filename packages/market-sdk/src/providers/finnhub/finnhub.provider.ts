/**
 * Finnhub Provider
 * Market news and sentiment data
 * Requires API key (60 requests/min on free tier)
 */

import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

export interface FinnhubNewsArticle {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface FinnhubMarketStatus {
  exchange: string;
  holiday: string | null;
  isOpen: boolean;
  session: string;
  timezone: string;
  t: number;
}

@Injectable()
export class FinnhubProvider {
  private readonly logger = new Logger(FinnhubProvider.name);
  readonly name = "finnhub";

  /**
   * Get general market news
   * @param apiKey Finnhub API key
   * @param category 'general' | 'forex' | 'crypto' | 'merger'
   */
  async getMarketNews(
    apiKey: string,
    category = "general",
  ): Promise<FinnhubNewsArticle[]> {
    try {
      const response = await axios.get(`${FINNHUB_BASE_URL}/news`, {
        params: { category, token: apiKey },
        timeout: 10000,
      });
      return response.data || [];
    } catch (error: any) {
      this.logger.error(`Market news fetch failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get company-specific news
   * @param apiKey Finnhub API key
   * @param symbol Stock symbol (e.g., 'AAPL')
   * @param from Start date YYYY-MM-DD
   * @param to End date YYYY-MM-DD
   */
  async getCompanyNews(
    apiKey: string,
    symbol: string,
    from: string,
    to: string,
  ): Promise<FinnhubNewsArticle[]> {
    try {
      const response = await axios.get(`${FINNHUB_BASE_URL}/company-news`, {
        params: { symbol, from, to, token: apiKey },
        timeout: 10000,
      });
      return response.data || [];
    } catch (error: any) {
      this.logger.error(`Company news fetch failed for ${symbol}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get market status for an exchange
   * @param apiKey Finnhub API key
   * @param exchange Exchange code (e.g., 'US')
   */
  async getMarketStatus(
    apiKey: string,
    exchange = "US",
  ): Promise<FinnhubMarketStatus | null> {
    try {
      const response = await axios.get(`${FINNHUB_BASE_URL}/stock/market-status`, {
        params: { exchange, token: apiKey },
        timeout: 10000,
      });
      return response.data || null;
    } catch (error: any) {
      this.logger.error(`Market status fetch failed: ${error.message}`);
      return null;
    }
  }
}
