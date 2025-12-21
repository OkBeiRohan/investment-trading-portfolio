/**
 * Historical Data gRPC Controller
 * Official NestJS gRPC approach using @grpc/proto-loader
 */

import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import {
  Metadata,
  type ServerUnaryCall,
  type ServerDuplexStream,
} from '@grpc/grpc-js';
import { Observable, Subject } from 'rxjs';
import { HistoricalDataService } from './historical-data.service';

interface LoadHistoricalDataRequest {
  instrumentKeys: string[];
  intervals: string[];
  fromDate: string;
  toDate: string;
}

interface LoadHistoricalDataResponse {
  totalCandles: number;
  durationMs: number;
  traceId: string;
}

interface BackfillRequest {
  instrumentKeys: string[];
  intervals: string[];
  fromDate: string;
  toDate: string;
}

interface BackfillProgress {
  totalInstruments: number;
  completedInstruments: number;
  currentInstrument: string;
  totalCandles: number;
  elapsedMs: number;
}

@Controller()
export class HistoricalDataGrpcController {
  private readonly logger = new Logger(HistoricalDataGrpcController.name);

  constructor(
    private readonly historicalDataService: HistoricalDataService,
    private readonly telemetryService: TelemetryService,
  ) {}

  @GrpcMethod('HistoricalDataService')
  async loadHistoricalData(
    request: LoadHistoricalDataRequest,
    _metadata: Metadata,
    _call: ServerUnaryCall<any, any>,
  ): Promise<LoadHistoricalDataResponse> {
    const startTime = Date.now();

    this.logger.log(
      `gRPC LoadHistoricalData: ${request.instrumentKeys.length} instruments (trace_id: ${0})`,
    );

    try {
      const totalCandles =
        await this.historicalDataService.backfillHistoricalData({
          instrumentKeys: request.instrumentKeys,
          intervals: request.intervals,
          fromDate: request.fromDate,
          toDate: request.toDate,
        });

      return {
        totalCandles,
        durationMs: Date.now() - startTime,
        traceId: "",
      };
    } catch (error) {
      this.logger.error('gRPC LoadHistoricalData failed', error);
      throw error;
    }
  }

  @GrpcStreamMethod('HistoricalDataService')
  streamBackfillProgress(
    request: BackfillRequest,
    _metadata: Metadata,
    _call: ServerDuplexStream<any, any>,
  ): Observable<BackfillProgress> {
    const subject = new Subject<BackfillProgress>();
    const traceId = this.telemetryService.getCurrentTraceId() || 'no-trace';

    this.logger.log(
      `gRPC StreamBackfillProgress started (trace_id: ${traceId})`,
    );

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

    return subject.asObservable();
  }
}
