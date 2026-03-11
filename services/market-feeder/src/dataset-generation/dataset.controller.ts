import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { DatasetGenerationService, DatasetExportConfig } from './dataset-generation.service';

class TriggerExportDto {
  instrumentKey: string;
  startDate: string; // ISO String
  endDate: string; // ISO String
  cvFolds?: number;
}

@Controller('datasets')
export class DatasetController {
  constructor(private readonly datasetService: DatasetGenerationService) {}

  @Post('export')
  @HttpCode(HttpStatus.OK)
  async triggerExport(@Body() body: TriggerExportDto) {
    const config: DatasetExportConfig = {
      instrumentKey: body.instrumentKey || 'NSE_INDEX|Nifty 50',
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      cvFolds: body.cvFolds,
    };

    // Run asynchronously to not block the HTTP response (Parquet generation takes time)
    // In production, consider a job queue (BullMQ) or returning an execution ID. 
    this.datasetService.exportDataset(config).catch(err => {
        // Log handled in service
    });

    return {
      message: 'Dataset export pipeline triggered asynchronously',
      config,
    };
  }
}
