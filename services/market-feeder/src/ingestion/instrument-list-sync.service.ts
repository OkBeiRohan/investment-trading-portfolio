import { Injectable, Logger } from "@nestjs/common";
import { InstrumentRepository, ProcessingLogRepository } from "@repo/database";
import { createGunzip } from "zlib";
import { Readable } from "stream";

interface UpstoxBodInstrument {
  instrument_key: string;
  exchange_token: string;
  tradingsymbol: string;
  name: string;
  last_price: number;
  expiry: string;
  strike: number;
  tick_size: number;
  lot_size: number;
  instrument_type: string;
  option_type: string;
  exchange: string;
  isin?: string;
  short_name?: string;
  segment?: string;
  underlying_key?: string;
  underlying_symbol?: string;
}

const UPSTOX_INSTRUMENT_URLS: Record<string, string> = {
  NSE: "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz",
  BSE: "https://assets.upstox.com/market-quote/instruments/exchange/BSE.json.gz",
  MCX: "https://assets.upstox.com/market-quote/instruments/exchange/MCX.json.gz",
};

@Injectable()
export class InstrumentListSyncService {
  private readonly logger = new Logger(InstrumentListSyncService.name);

  constructor(
    private readonly instrumentRepo: InstrumentRepository,
    private readonly processingLogRepo: ProcessingLogRepository,
  ) {}

  async syncAll(
    exchanges: string[] = ["NSE", "MCX"],
  ): Promise<{ totalUpserted: number; totalDeactivated: number }> {
    const syncStartTime = new Date();
    let totalUpserted = 0;

    await this.processingLogRepo.logInfo(
      "FETCH",
      "INSTRUMENT_LIST_SYNC",
      "Starting BOD instrument list sync",
      { service: "InstrumentListSyncService", exchanges },
    );

    for (const exchange of exchanges) {
      const url = UPSTOX_INSTRUMENT_URLS[exchange];
      if (!url) {
        this.logger.warn(`No instrument URL configured for exchange: ${exchange}`);
        continue;
      }

      try {
        const upserted = await this.syncExchange(exchange, url, syncStartTime);
        totalUpserted += upserted;
        this.logger.log(
          `Synced ${exchange}: ${upserted} instruments upserted`,
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to sync ${exchange}: ${msg}`);
        await this.processingLogRepo.logError(
          "FETCH",
          "INSTRUMENT_LIST_SYNC",
          `${exchange} sync failed: ${msg}`,
          { service: "InstrumentListSyncService", exchange },
        );
      }
    }

    const deactivated = await this.instrumentRepo.markStaleInactive(syncStartTime);

    await this.processingLogRepo.logInfo(
      "FETCH",
      "INSTRUMENT_LIST_SYNC",
      "Completed",
      {
        service: "InstrumentListSyncService",
        totalUpserted,
        totalDeactivated: deactivated,
      },
    );

    this.logger.log(
      `BOD sync complete: ${totalUpserted} upserted, ${deactivated} deactivated`,
    );

    return { totalUpserted, totalDeactivated: deactivated };
  }

  private async syncExchange(
    exchange: string,
    url: string,
    syncTime: Date,
  ): Promise<number> {
    const instruments = await this.downloadInstruments(url);
    this.logger.log(
      `Downloaded ${instruments.length} instruments from ${exchange}`,
    );

    const BATCH_SIZE = 1000;
    let upserted = 0;

    for (let i = 0; i < instruments.length; i += BATCH_SIZE) {
      const batch = instruments.slice(i, i + BATCH_SIZE);
      const docs = batch.map((inst) =>
        this.mapToInstrument(inst, exchange, syncTime),
      );
      const count = await this.instrumentRepo.upsertMany(docs);
      upserted += count;

      if ((i + BATCH_SIZE) % 10000 === 0) {
        this.logger.debug(
          `${exchange} progress: ${Math.min(i + BATCH_SIZE, instruments.length)}/${instruments.length}`,
        );
      }
    }

    return upserted;
  }

  private async downloadInstruments(
    url: string,
  ): Promise<UpstoxBodInstrument[]> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download instruments: HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const decompressed = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const gunzip = createGunzip();
      const readable = Readable.from(buffer);

      readable
        .pipe(gunzip)
        .on("data", (chunk: Buffer) => chunks.push(chunk))
        .on("end", () => resolve(Buffer.concat(chunks)))
        .on("error", reject);
    });

    return JSON.parse(decompressed.toString("utf-8"));
  }

  private mapToInstrument(
    inst: UpstoxBodInstrument,
    exchange: string,
    syncTime: Date,
  ): Record<string, unknown> {
    const instrumentType = this.resolveInstrumentType(inst.instrument_type);
    const segment = inst.segment || this.resolveSegment(inst.instrument_type, exchange);

    return {
      instrumentKey: inst.instrument_key,
      instrumentType,
      exchange: inst.exchange || exchange,
      segment,
      tradingSymbol: inst.tradingsymbol,
      name: inst.name || inst.short_name || inst.tradingsymbol,
      isin: inst.isin,
      underlyingKey: inst.underlying_key,
      underlyingSymbol: inst.underlying_symbol,
      expiry: inst.expiry ? new Date(inst.expiry) : undefined,
      strikePrice: inst.strike || undefined,
      optionType: inst.option_type === "CE" || inst.option_type === "PE"
        ? inst.option_type
        : undefined,
      lotSize: inst.lot_size,
      tickSize: inst.tick_size,
      isActive: true,
      lastBodSyncAt: syncTime,
    };
  }

  private resolveInstrumentType(
    upstoxType: string,
  ): "INDEX" | "EQUITY" | "FUTURE" | "OPTION" {
    const upper = (upstoxType || "").toUpperCase();
    if (upper.includes("INDEX")) return "INDEX";
    if (upper.includes("OPT") || upper === "CE" || upper === "PE")
      return "OPTION";
    if (upper.includes("FUT")) return "FUTURE";
    return "EQUITY";
  }

  private resolveSegment(upstoxType: string, exchange: string): string {
    const upper = (upstoxType || "").toUpperCase();
    if (upper.includes("INDEX")) return "INDEX";
    if (upper.includes("OPT") || upper.includes("FUT")) return "FO";
    if (exchange === "MCX") return "MCX";
    return "EQ";
  }
}
