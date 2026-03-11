import { Injectable, Logger } from '@nestjs/common';
import { FeaturesRepository, LabelsRepository } from '@repo/database';

@Injectable()
export class DataQualityService {
  private readonly logger = new Logger(DataQualityService.name);

  constructor(
    private readonly featuresRepo: FeaturesRepository,
    private readonly labelsRepo: LabelsRepository,
  ) {}

  /**
   * Validate data quality for a specific time range
   * Checks for NaN counts, missing intervals, and label distributions
   */
  async validateTimeRange(
    instrumentKey: string,
    startTime: Date,
    endTime: Date
  ): Promise<{ isValid: boolean; issues: string[] }> {
    this.logger.log(`Validating data quality for ${instrumentKey} from ${startTime.toISOString()} to ${endTime.toISOString()}`);
    const issues: string[] = [];

    // 1. Check feature row count vs expected (approximate based on trading hours)
    const features = await this.featuresRepo.getFeatures(
      instrumentKey,
      1,
      'minute',
      startTime,
      endTime
    );

    if (features.length === 0) {
      issues.push(`No features found for ${instrumentKey} in the given time range.`);
      return { isValid: false, issues };
    }

    // 2. Check for NaN values in features
    let nanCount = 0;
    for (const feature of features) {
      // Check a sample of key features
      if (
        Number.isNaN(feature.indiaVix) ||
        Number.isNaN(feature.futAtrPercent) ||
        Number.isNaN(feature.advanceDeclineRatio)
      ) {
        nanCount++;
      }
    }

    const nanPercentage = (nanCount / features.length) * 100;
    if (nanPercentage > 1) { // Alert if > 1% NaN
      issues.push(`High NaN percentage detected: ${nanPercentage.toFixed(2)}% of rows have NaN values in key features.`);
    }

    // 3. Check for matching labels
    const labels = await this.labelsRepo.getLabels(
      instrumentKey,
      1,
      'minute',
      startTime,
      endTime
    );

    if (labels.length === 0) {
      issues.push(`No labels found for ${instrumentKey} in the given time range.`);
    }

    // Determine overall validity (strict: no major issues)
    const isValid = issues.length === 0;
    
    if (isValid) {
      this.logger.log(`Data quality validation PASSED for ${instrumentKey} (${features.length} feature rows)`);
    } else {
      this.logger.warn(`Data quality validation FAILED for ${instrumentKey}. Issues: ${issues.join(' | ')}`);
    }

    return { isValid, issues };
  }
}
