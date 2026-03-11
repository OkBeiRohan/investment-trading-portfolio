import { Injectable, Logger } from '@nestjs/common';
import { DataQualityService } from './data-quality.service';
import { CpcvSplitter, CpcvSplit } from './cpcv-splitter.service';
import { ParquetExportService } from './parquet-export.service';
import * as path from 'path';

/**
 * Configuration for the dataset export job
 */
export interface DatasetExportConfig {
  instrumentKey: string;
  startDate: Date;
  endDate: Date;
  cvFolds?: number;
  testGroupRatio?: number; // e.g. 5 means 1/5th are test groups per fold
  embargoMinutes?: number;
  outputDirectory?: string;
}

@Injectable()
export class DatasetGenerationService {
  private readonly logger = new Logger(DatasetGenerationService.name);

  constructor(
    private readonly dataQualityService: DataQualityService,
    private readonly parquetExportService: ParquetExportService,
  ) {}

  /**
   * Orchestrates the entire dataset generation pipeline
   */
  async exportDataset(config: DatasetExportConfig): Promise<{
    success: boolean;
    splits?: CpcvSplit[];
    outputPaths?: string[];
    error?: string;
  }> {
    const {
      instrumentKey,
      startDate,
      endDate,
      cvFolds = 5,
      testGroupRatio = 5, // 1/5th for test
      embargoMinutes = 30, // Default 30 min purge for max label horizon (30m)
      outputDirectory = path.join(process.cwd(), 'data', 'datasets'),
    } = config;

    this.logger.log(`Starting dataset export for ${instrumentKey}`);

    try {
      // 1. Data Quality Check
      const qualityCheck = await this.dataQualityService.validateTimeRange(
        instrumentKey,
        startDate,
        endDate
      );

      if (!qualityCheck.isValid) {
        throw new Error(`Data quality validation failed: ${qualityCheck.issues.join('; ')}`);
      }

      // 2. Generate CPCV Splits
      const groups = cvFolds * testGroupRatio;
      const testGroups = testGroupRatio;
      
      this.logger.log(`Generating CPCV splits (${groups} groups, select ${testGroups} for testing) with ${embargoMinutes}m embargo...`);
      const splits = CpcvSplitter.generateSplits({
        startDate,
        endDate,
        groups,
        testGroups,
        embargoMinutes,
      });

      this.logger.log(`Generated ${splits.length} valid CPCV folds.`);

      // 3. Export splits to Parquet
      const outputPaths: string[] = [];
      const timestamp = Date.now();
      const jobDir = path.join(outputDirectory, `${instrumentKey.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`);

      for (const split of splits) {
        // Export Training subset
        const trainPath = await this.parquetExportService.exportSplitToParquet(
          instrumentKey,
          'train',
          split.fold,
          split.trainRanges,
          jobDir
        );
        outputPaths.push(trainPath);

        // Export Testing subset
        const testPath = await this.parquetExportService.exportSplitToParquet(
          instrumentKey,
          'test',
          split.fold,
          split.testRanges,
          jobDir
        );
        outputPaths.push(testPath);
      }

      this.logger.log(`Successfully exported ${outputPaths.length} parquet files to ${jobDir}`);

      return {
        success: true,
        splits,
        outputPaths,
      };

    } catch (error: any) {
      this.logger.error(`Failed to export dataset: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
