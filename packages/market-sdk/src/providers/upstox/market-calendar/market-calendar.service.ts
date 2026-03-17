import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { SystemConfigRepository } from "@repo/database";

export interface MarketHoliday {
  date: string;
  description: string;
  holidayType: "TRADING_HOLIDAY" | "SETTLEMENT_HOLIDAY" | "SPECIAL_TIMING";
  closedExchanges: string[];
  openExchanges: Array<{
    exchange: string;
    startTime: number;
    endTime: number;
  }>;
}

interface UpstoxHolidayResponse {
  status: string;
  data: Array<{
    date: string;
    description: string;
    holiday_type: string;
    closed_exchanges: string[];
    open_exchanges: Array<{
      exchange: string;
      start_time: number;
      end_time: number;
    }>;
  }>;
}

const HOLIDAYS_CACHE_KEY_PREFIX = "market.holidays";
const HOLIDAYS_API_URL = "https://api.upstox.com/v2/market/holidays";

@Injectable()
export class MarketCalendarService implements OnModuleInit {
  private readonly logger = new Logger(MarketCalendarService.name);
  private holidays: MarketHoliday[] = [];
  private lastSyncYear: number | null = null;

  constructor(
    private readonly systemConfigRepo: SystemConfigRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureHolidaysLoaded();
  }

  async isMarketOpenToday(exchange = "NSE"): Promise<boolean> {
    const today = this.getTodayIST();
    return this.isTradingDay(today, exchange);
  }

  async isTradingDay(date: Date | string, exchange = "NSE"): Promise<boolean> {
    await this.ensureHolidaysLoaded();

    const d = typeof date === "string" ? new Date(date) : date;
    const dayOfWeek = this.getDayOfWeekIST(d);
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;

    const dateStr = this.formatDateIST(d);
    const holiday = this.holidays.find((h) => h.date === dateStr);

    if (!holiday) return true;

    if (holiday.closedExchanges.includes(exchange)) return false;

    const openForExchange = holiday.openExchanges.find(
      (e) => e.exchange === exchange,
    );
    return !!openForExchange;
  }

  async getNextTradingDay(exchange = "NSE"): Promise<Date> {
    const today = this.getTodayIST();
    const candidate = new Date(today);
    candidate.setDate(candidate.getDate() + 1);

    for (let i = 0; i < 30; i++) {
      if (await this.isTradingDay(candidate, exchange)) {
        return candidate;
      }
      candidate.setDate(candidate.getDate() + 1);
    }

    return candidate;
  }

  async getMarketHours(
    date: Date | string,
    exchange = "NSE",
  ): Promise<{ open: string; close: string } | null> {
    await this.ensureHolidaysLoaded();

    const dateStr =
      typeof date === "string" ? date : this.formatDateIST(date);
    const holiday = this.holidays.find((h) => h.date === dateStr);

    if (!holiday) {
      if (exchange === "NSE" || exchange === "BSE" || exchange === "NFO" || exchange === "BFO") {
        return { open: "09:15", close: "15:30" };
      }
      if (exchange === "MCX") {
        return { open: "09:00", close: "23:30" };
      }
      return { open: "09:15", close: "15:30" };
    }

    if (holiday.closedExchanges.includes(exchange)) return null;

    const openForExchange = holiday.openExchanges.find(
      (e) => e.exchange === exchange,
    );
    if (!openForExchange) return null;

    const openDate = new Date(openForExchange.startTime);
    const closeDate = new Date(openForExchange.endTime);
    return {
      open: `${String(openDate.getUTCHours()).padStart(2, "0")}:${String(openDate.getUTCMinutes()).padStart(2, "0")}`,
      close: `${String(closeDate.getUTCHours()).padStart(2, "0")}:${String(closeDate.getUTCMinutes()).padStart(2, "0")}`,
    };
  }

  async isMarketCurrentlyOpen(exchange = "NSE"): Promise<boolean> {
    const today = this.getTodayIST();
    if (!(await this.isTradingDay(today, exchange))) return false;

    const hours = await this.getMarketHours(today, exchange);
    if (!hours) return false;

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
    const currentMinutes = istNow.getHours() * 60 + istNow.getMinutes();

    const [openH, openM] = hours.open.split(":").map(Number);
    const [closeH, closeM] = hours.close.split(":").map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  }

  async syncHolidays(): Promise<number> {
    try {
      const response = await fetch(HOLIDAYS_API_URL, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Upstox holidays API returned ${response.status}`);
      }

      const data = (await response.json()) as UpstoxHolidayResponse;
      if (data.status !== "success" || !Array.isArray(data.data)) {
        throw new Error("Invalid holidays response format");
      }

      this.holidays = data.data.map((h) => ({
        date: h.date,
        description: h.description,
        holidayType: h.holiday_type as MarketHoliday["holidayType"],
        closedExchanges: h.closed_exchanges,
        openExchanges: (h.open_exchanges || []).map((e) => ({
          exchange: e.exchange,
          startTime: e.start_time,
          endTime: e.end_time,
        })),
      }));

      const year = new Date().getFullYear();
      await this.systemConfigRepo.upsertConfig(
        `${HOLIDAYS_CACHE_KEY_PREFIX}.${year}`,
        {
          key: `${HOLIDAYS_CACHE_KEY_PREFIX}.${year}`,
          value: this.holidays,
          category: "market",
          description: `Market holidays for ${year}`,
          valueType: "json",
        },
      );

      this.lastSyncYear = year;
      this.logger.log(
        `Synced ${this.holidays.length} holidays for ${year}`,
      );
      return this.holidays.length;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync holidays: ${msg}`);
      throw error;
    }
  }

  private async ensureHolidaysLoaded(): Promise<void> {
    const year = new Date().getFullYear();
    if (this.lastSyncYear === year && this.holidays.length > 0) return;

    const cached = await this.systemConfigRepo.getTyped<MarketHoliday[]>(
      `${HOLIDAYS_CACHE_KEY_PREFIX}.${year}`,
      [],
    );

    if (cached.length > 0) {
      this.holidays = cached;
      this.lastSyncYear = year;
      this.logger.log(
        `Loaded ${cached.length} holidays from cache for ${year}`,
      );
      return;
    }

    try {
      await this.syncHolidays();
    } catch {
      this.logger.warn("Could not sync holidays; operating without calendar data");
    }
  }

  private getTodayIST(): Date {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(now.getTime() + istOffset + now.getTimezoneOffset() * 60 * 1000);
  }

  private getDayOfWeekIST(date: Date): number {
    return date.getDay();
  }

  private formatDateIST(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
}
