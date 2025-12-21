/**
 * Historical Data gRPC Controller
 * Exposes backfill operations via gRPC API
 * Uses generated Protocol Buffer types for strict type safety
 */

import { Controller, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { HistoricalDataService } from './historical-data.service';
import { TelemetryService } from '../common/services/telemetry.service';
import {
  LoadHistoricalDataRequest,
  LoadHistoricalDataResponse,
  BackfillRequest,
  BackfillProgress,
  HistoricalDataServiceController,
  HistoricalDataServiceControllerMethods,
} from '../generated/historical-data';

@Controller()
@HistoricalDataServiceControllerMethods()
export class HistoricalDataGrpcController implements HistoricalDataServiceController {
  private readonly logger = new Logger(HistoricalDataGrpcController.name);

  constructor(
    private readonly historicalDataService: HistoricalDataService,
    private readonly telemetryService: TelemetryService,
  ) {}

  /**
   * gRPC method: LoadHistoricalData
   * Unary RPC for backfilling historical data
   */
  async loadHistoricalData(
    request: LoadHistoricalDataRequest,
  ): Promise<LoadHistoricalDataResponse> {
    const startTime = Date.now();
    const traceId = this.telemetryService.getCurrentTraceId() || 'no-trace';

    this.logger.log(
      `gRPC LoadHistoricalData: ${request.instrumentKeys.length} instruments (trace_id: ${traceId})`,
    );

    try {
      const totalCandles =
        await this.historicalDataService.backfillHistoricalData({
          instrumentKeys: request.instrumentKeys,
          intervals: request.intervals,
          fromDate: request.fromDate,
          toDate: request.toDate,
        });

      const durationMs = Date.now() - startTime;

      return {
        totalCandles,
        durationMs,
        traceId,
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
  streamBackfillProgress(
    request: BackfillRequest,
  ): Observable<BackfillProgress> {
    const subject = new Subject<BackfillProgress>();
    const traceId = this.telemetryService.getCurrentTraceId() || 'no-trace';

    this.logger.log(
      `gRPC StreamBackfillProgress started (trace_id: ${traceId})`,
    );

    // Start backfill in background
    void (async () => {
      try {
        await this.historicalDataService.backfillHistoricalData({
          instrumentKeys: request.instrumentKeys,
          intervals: request.intervals,
          fromDate: request.fromDate,
          toDate: request.toDate,
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
