/**
 * Historical Data Controller
 * HTTP endpoints for triggering data bootstrap
 */

import { Controller, Post, Get, Param, Query, Logger } from "@nestjs/common";
import { ComprehensiveBootstrapService } from "./comprehensive-bootstrap.service";
import { ProductionUpstoxClient } from "./production-upstox-client";

@Controller("historical-data")
export class HistoricalDataController {
  private readonly logger = new Logger(HistoricalDataController.name);

  constructor(
    private readonly bootstrapService: ComprehensiveBootstrapService,
    private readonly upstoxClient: ProductionUpstoxClient
  ) { }

  /**
   * Run full bootstrap (ALL data)
   * POST /historical-data/bootstrap/full
   */
  @Post("bootstrap/full")
  async runFullBootstrap() {
    this.logger.log("Starting full bootstrap...");
    const results = await this.bootstrapService.runFullBootstrap();
    return Object.fromEntries(results);
  }

  /**
   * Bootstrap indices only (quick test)
   * POST /historical-data/bootstrap/indices
   */
  @Post("bootstrap/indices")
  async bootstrapIndices() {
    this.logger.log("Starting indices bootstrap...");
    return this.bootstrapService.bootstrapIndicesOnly();
  }

  /**
   * Bootstrap a single instrument
   * POST /historical-data/bootstrap/instrument/:instrumentKey
   */
  @Post("bootstrap/instrument/:instrumentKey")
  async bootstrapInstrument(@Param("instrumentKey") instrumentKey: string) {
    // Decode URL-encoded instrument key
    const decoded = decodeURIComponent(instrumentKey);
    this.logger.log(`Starting bootstrap for ${decoded}...`);
    return this.bootstrapService.bootstrapInstrument(decoded);
  }

  /**
   * Discover data start date for an instrument
   * GET /historical-data/discover/:instrumentKey?timeframe=day|minute
   */
  @Get("discover/:instrumentKey")
  async discoverStartDate(
    @Param("instrumentKey") instrumentKey: string,
    @Query("timeframe") timeframe: "day" | "minute" = "day"
  ) {
    const decoded = decodeURIComponent(instrumentKey);
    const startDate = await this.upstoxClient.discoverDataStartDate(decoded, timeframe);
    return {
      instrumentKey: decoded,
      timeframe,
      startDate: startDate?.toISOString().split("T")[0] || null,
    };
  }

  /**
   * Get all Nifty expiries
   * GET /historical-data/expiries
   */
  @Get("expiries")
  async getExpiries() {
    const expiries = await this.upstoxClient.getExpiries("NSE_INDEX|Nifty 50");
    return { expiries, count: expiries.length };
  }

  /**
   * Get option contracts for an expiry
   * GET /historical-data/options/:expiryDate
   */
  @Get("options/:expiryDate")
  async getOptionContracts(@Param("expiryDate") expiryDate: string) {
    const options = await this.upstoxClient.getExpiredOptionContracts(
      "NSE_INDEX|Nifty 50",
      expiryDate
    );
    return {
      expiryDate,
      contracts: options.length,
      calls: options.filter(o => o.option_type === "CE").length,
      puts: options.filter(o => o.option_type === "PE").length,
    };
  }

  /**
   * Health check
   * GET /historical-data/health
   */
  @Get("health")
  health() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
