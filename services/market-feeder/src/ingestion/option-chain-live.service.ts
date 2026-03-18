import { Injectable, Logger } from '@nestjs/common';
import {
  OptionChainRepository,
  OptionChainTickRepository,
  type OptionChainTick,
  ProcessingLogRepository,
} from '@repo/database';
import { OptionChainSnapshot } from '@repo/schema';
import { UpstoxHistoricalAPIService } from '@repo/market-sdk';
import { AuthManagerService } from '@repo/authentication';
import { NIFTY50_INDEX } from '../historical-data/nifty50-instruments';

@Injectable()
export class OptionChainLiveService {
  private readonly logger = new Logger(OptionChainLiveService.name);

  constructor(
    private readonly upstoxApi: UpstoxHistoricalAPIService,
    private readonly authManager: AuthManagerService,
    private readonly optionChainRepo: OptionChainRepository,
    private readonly optionChainTickRepo: OptionChainTickRepository,
    private readonly processingLogRepo: ProcessingLogRepository,
  ) {}

  async fetchAndStoreOptionChainSnapshot(): Promise<{
    snapshotsStored: number;
    ticksStored: number;
    errors: string[];
  }> {
    const start = Date.now();
    let snapshotsStored = 0;
    let ticksStored = 0;
    const errors: string[] = [];

    try {
      await this.ensureApiToken();

      const expiries = await this.upstoxApi.getExpiryDates(NIFTY50_INDEX);
      const nearestExpiries = expiries.slice(0, 2);
      const now = new Date();

      if (nearestExpiries.length === 0) {
        this.logger.warn('No expiry dates found for option chain');
        return { snapshotsStored: 0, ticksStored: 0, errors: ['No expiry dates available'] };
      }

      this.logger.debug(`Fetching option chain for ${nearestExpiries.length} expiries: ${nearestExpiries.join(', ')}`);

      for (const expiryDate of nearestExpiries) {
        try {
          const chain = await this.upstoxApi.getOptionChainV3(NIFTY50_INDEX, expiryDate);
          if (chain.length === 0) continue;

          const snapshots: OptionChainSnapshot[] = [];
          const ticks: OptionChainTick[] = [];
          const spotPrice = chain[0]?.call_options?.market_data?.ltp
            ?? chain[0]?.put_options?.market_data?.ltp
            ?? 0;

          const expiry = new Date(expiryDate);
          const timeToExpiry = Math.max(0, (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365));

          for (const strike of chain) {
            if (strike.call_options?.instrument_key) {
              const call = strike.call_options;
              snapshots.push({
                timestamp: now,
                instrumentKey: call.instrument_key,
                underlyingKey: strike.underlying_key,
                expiry,
                strike: strike.strike_price,
                optionType: 'CE',
                lastPrice: call.market_data.ltp,
                bidPrice: call.market_data.bid_price,
                askPrice: call.market_data.ask_price,
                bidQty: call.market_data.bid_qty,
                askQty: call.market_data.ask_qty,
                iv: call.option_greeks.iv,
                delta: call.option_greeks.delta,
                gamma: call.option_greeks.gamma,
                theta: call.option_greeks.theta,
                vega: call.option_greeks.vega,
                pop: call.option_greeks.pop,
                openInterest: call.market_data.oi,
                volume: call.market_data.volume,
              });

              const intrinsic = Math.max(0, spotPrice - strike.strike_price);
              ticks.push({
                timestamp: now,
                instrumentKey: call.instrument_key,
                tradingSymbol: call.instrument_key,
                underlyingKey: strike.underlying_key,
                expiry,
                strikePrice: strike.strike_price,
                optionType: 'CE',
                ltp: call.market_data.ltp,
                open: null,
                high: null,
                low: null,
                close: null,
                volume: call.market_data.volume,
                openInterest: call.market_data.oi,
                bidPrice: call.market_data.bid_price,
                bidQty: call.market_data.bid_qty,
                askPrice: call.market_data.ask_price,
                askQty: call.market_data.ask_qty,
                delta: call.option_greeks.delta,
                gamma: call.option_greeks.gamma,
                theta: call.option_greeks.theta,
                vega: call.option_greeks.vega,
                iv: call.option_greeks.iv,
                underlyingPrice: spotPrice,
                timeToExpiry,
                moneyness: spotPrice > 0 ? strike.strike_price / spotPrice : null,
                intrinsicValue: intrinsic,
                timeValue: call.market_data.ltp - intrinsic,
              });
            }

            if (strike.put_options?.instrument_key) {
              const put = strike.put_options;
              snapshots.push({
                timestamp: now,
                instrumentKey: put.instrument_key,
                underlyingKey: strike.underlying_key,
                expiry,
                strike: strike.strike_price,
                optionType: 'PE',
                lastPrice: put.market_data.ltp,
                bidPrice: put.market_data.bid_price,
                askPrice: put.market_data.ask_price,
                bidQty: put.market_data.bid_qty,
                askQty: put.market_data.ask_qty,
                iv: put.option_greeks.iv,
                delta: put.option_greeks.delta,
                gamma: put.option_greeks.gamma,
                theta: put.option_greeks.theta,
                vega: put.option_greeks.vega,
                pop: put.option_greeks.pop,
                openInterest: put.market_data.oi,
                volume: put.market_data.volume,
              });

              const intrinsic = Math.max(0, strike.strike_price - spotPrice);
              ticks.push({
                timestamp: now,
                instrumentKey: put.instrument_key,
                tradingSymbol: put.instrument_key,
                underlyingKey: strike.underlying_key,
                expiry,
                strikePrice: strike.strike_price,
                optionType: 'PE',
                ltp: put.market_data.ltp,
                open: null,
                high: null,
                low: null,
                close: null,
                volume: put.market_data.volume,
                openInterest: put.market_data.oi,
                bidPrice: put.market_data.bid_price,
                bidQty: put.market_data.bid_qty,
                askPrice: put.market_data.ask_price,
                askQty: put.market_data.ask_qty,
                delta: put.option_greeks.delta,
                gamma: put.option_greeks.gamma,
                theta: put.option_greeks.theta,
                vega: put.option_greeks.vega,
                iv: put.option_greeks.iv,
                underlyingPrice: spotPrice,
                timeToExpiry,
                moneyness: spotPrice > 0 ? strike.strike_price / spotPrice : null,
                intrinsicValue: intrinsic,
                timeValue: put.market_data.ltp - intrinsic,
              });
            }
          }

          if (snapshots.length > 0) {
            await this.optionChainRepo.insertBatch(snapshots);
            snapshotsStored += snapshots.length;
          }

          if (ticks.length > 0) {
            await this.optionChainTickRepo.insertBatch(ticks);
            ticksStored += ticks.length;
          }
        } catch (err) {
          const msg = `Option chain ${expiryDate}: ${err instanceof Error ? err.message : String(err)}`;
          errors.push(msg);
          this.logger.error(msg);
        }
      }

      const durationMs = Date.now() - start;
      this.logger.log(
        `Option chain snapshot: ${snapshotsStored} snapshots, ${ticksStored} ticks stored (${durationMs}ms)`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(msg);
      this.logger.error(`Option chain live fetch failed: ${msg}`);
      await this.processingLogRepo.logError(
        'LIVE',
        'OPTION_CHAIN_SNAPSHOT',
        msg,
        { service: 'OptionChainLiveService' },
      );
    }

    return { snapshotsStored, ticksStored, errors };
  }

  private async ensureApiToken(): Promise<void> {
    const token = await this.authManager.getAccessToken('system', 'upstox', 'LIVE');
    this.upstoxApi.setAccessToken(token);
  }
}
