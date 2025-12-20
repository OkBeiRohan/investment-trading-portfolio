/**
 * Historical Data gRPC Controller
 * Exposes backfill operations via gRPC API
 */

import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { Observable, Subject } from 'rxjs';
import { HistoricalDataService } from './historical-data.service';
import type { BackfillProgress } from './historical-data.service';
import { TelemetryService } from '../common/services/telemetry.service';
import { trace } from '@opentelemetry/api';

interface LoadHistoricalDataRequest {
  instrument_keys: string[];
  intervals: string[];
  from_date?: string;
  to_date?: string;
}

interface LoadHistoricalDataResponse {
  total_candles: number;
  duration_ms: number;
  trace_id: string;
}

interface BackfillRequest {
  instrument_keys: string[];
  intervals: string[];
  from_date?: string;
  to_date?: string;
}

interface BackfillProgressProto {
  total_instruments: number;
  completed_instruments: number;
  current_instrument: string;
  total_candles: number;
  elapsed_ms: number;
}

@Controller()
export class HistoricalDataGrpcController {
  private readonly logger = new Logger(HistoricalDataGrpcController.name);

  constructor(
    private readonly historicalDataService: HistoricalDataService,
    private readonly telemetryService: TelemetryService,
  ) {}

  /**
   * gRPC method: LoadHistoricalData
   * Unary RPC for backfilling historical data
   */
  @GrpcMethod('HistoricalDataService', 'LoadHistoricalData')
  async loadHistoricalData(
    request: LoadHistoricalDataRequest,
  ): Promise<LoadHistoricalDataResponse> {
    const startTime = Date.now();
    const traceId = this.telemetryService.getCurrentTraceId() || 'no-trace';

    this.logger.log(
      `gRPC LoadHistoricalData: ${request.instrument_keys.length} instruments (trace_id: ${traceId})`,
    );

    try {
      const totalCandles =
        await this.historicalDataService.backfillHistoricalData({
          instrumentKeys: request.instrument_keys,
          intervals: request.intervals,
          fromDate: request.from_date,
          toDate: request.to_date,
        });

      const durationMs = Date.now() - startTime;

      return {
        total_candles: totalCandles,
        duration_ms: durationMs,
        trace_id: traceId,
      };
    } catch (error) {
      this.logger.error('gRPC LoadHistoricalData failed', error);
      throw error;
    }
  }

  /**
   * gRPC method: StreamBackfillProgress
   * Server-streaming RPC for real-time progress updates
   */
  @GrpcStreamMethod('HistoricalDataService', 'StreamBackfillProgress')
  streamBackfillProgress(
    request: BackfillRequest,
  ): Observable<BackfillProgressProto> {
    const subject = new Subject<BackfillProgressProto>();
    const traceId = this.telemetryService.getCurrentTraceId() || 'no-trace';

    this.logger.log(
      `gRPC StreamBackfillProgress started (trace_id: ${traceId})`,
    );

    // Start backfill in background
    (async () => {
      try {
        await this.historicalDataService.backfillHistoricalData({
          instrumentKeys: request.instrument_keys,
          intervals: request.intervals,
          fromDate: request.from_date,
          toDate: request.to_date,
        });

        subject.complete();
      } catch (error) {
        this.logger.error('gRPC StreamBackfillProgress failed', error);
        subject.error(error);
      }
    })();

    // TODO: Subscribe to 'backfill.progress' events and stream to client
    // For now, complete immediately
    return subject.asObservable();
  }
}
