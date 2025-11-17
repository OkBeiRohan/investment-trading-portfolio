/**
 * TrainingDataService
 * Exports feature data as CSV for Python ML training
 * Orchestrates the training pipeline
 */

import { Injectable, Logger } from '@nestjs/common';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { FeatureSnapshot } from '@repo/schema';

@Injectable()
export class TrainingDataService {
  private readonly logger = new Logger(TrainingDataService.name);
  private readonly exportDir = '/tmp/algo-worker/training';

  constructor() {
    // Ensure export directory exists
    this.ensureExportDir();
  }

  private async ensureExportDir(): Promise<void> {
    try {
      await mkdir(this.exportDir, { recursive: true });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to create export directory', {
        error: errorMessage,
      });
    }
  }

  /**
   * Export feature snapshots to CSV for Python training
   */
  async exportToCSV(
    snapshots: FeatureSnapshot[],
    filename: string = 'training_data.csv',
  ): Promise<string> {
    const filePath = join(this.exportDir, filename);

    // Build CSV header
    const headers = [
      'timestamp',
      'instrument',
      // Underlying features
      'realizedVol5d',
      'realizedVol10d',
      'realizedVol20d',
      'rsi14',
      'macd_value',
      'macd_signal',
      'macd_histogram',
      // Sentiment features
      'indiaVix',
      'indiaVixMA5',
      'pcrVolume',
      'pcrOI',
      'maxPain',
      // Options features
      'atmIV',
      'volSkew',
      'termStructure',
      // Metadata
      'dataQuality',
    ];

    const rows = snapshots.map((snapshot) => {
      const features = snapshot.features;
      return [
        snapshot.timestamp.toISOString(),
        snapshot.instrument,
        features.realizedVol5d ?? '',
        features.realizedVol10d ?? '',
        features.realizedVol20d ?? '',
        features.rsi14 ?? '',
        features.macd?.value ?? '',
        features.macd?.signal ?? '',
        features.macd?.histogram ?? '',
        features.indiaVix ?? '',
        features.indiaVixMA5 ?? '',
        features.pcrVolume ?? '',
        features.pcrOI ?? '',
        features.maxPain ?? '',
        features.atmIV ?? '',
        features.volSkew ?? '',
        features.termStructure ?? '',
        snapshot.metadata.dataQuality,
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    await writeFile(filePath, csv, 'utf-8');
    this.logger.log(`Exported ${snapshots.length} snapshots to ${filePath}`);

    return filePath;
  }

  /**
   * Generate labeled training data
   * Label: 1 if VIX increased in next 4 hours, 0 otherwise
   */
  async generateLabeledData(
    snapshots: FeatureSnapshot[],
    lookAheadHours: number = 4,
  ): Promise<{ features: FeatureSnapshot; label: 0 | 1 }[]> {
    const labeled: { features: FeatureSnapshot; label: 0 | 1 }[] = [];

    for (let i = 0; i < snapshots.length - 1; i++) {
      const current = snapshots[i];
      const futureIndex = this.findFutureIndex(
        snapshots,
        i,
        lookAheadHours * 3600 * 1000,
      );

      if (futureIndex === -1) continue;

      const future = snapshots[futureIndex];
      const currentVix = current.features.indiaVix ?? 0;
      const futureVix = future.features.indiaVix ?? 0;

      const label: 0 | 1 = futureVix > currentVix ? 1 : 0;
      labeled.push({ features: current, label });
    }

    this.logger.log(`Generated ${labeled.length} labeled training examples`);
    return labeled;
  }

  /**
   * Find future snapshot index based on time delta
   */
  private findFutureIndex(
    snapshots: FeatureSnapshot[],
    currentIndex: number,
    deltaMs: number,
  ): number {
    const targetTime = snapshots[currentIndex].timestamp.getTime() + deltaMs;

    for (let i = currentIndex + 1; i < snapshots.length; i++) {
      if (snapshots[i].timestamp.getTime() >= targetTime) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Export labeled data to CSV with target variable
   */
  async exportLabeledToCSV(
    labeledData: { features: FeatureSnapshot; label: 0 | 1 }[],
    filename: string = 'training_labeled.csv',
  ): Promise<string> {
    const filePath = join(this.exportDir, filename);

    const headers = [
      'timestamp',
      'instrument',
      'realizedVol5d',
      'realizedVol10d',
      'realizedVol20d',
      'rsi14',
      'macd_value',
      'macd_signal',
      'macd_histogram',
      'indiaVix',
      'indiaVixMA5',
      'pcrVolume',
      'pcrOI',
      'maxPain',
      'atmIV',
      'volSkew',
      'termStructure',
      'dataQuality',
      'label', // Target variable
    ];

    const rows = labeledData.map(({ features: snapshot, label }) => {
      const features = snapshot.features;
      return [
        snapshot.timestamp.toISOString(),
        snapshot.instrument,
        features.realizedVol5d ?? '',
        features.realizedVol10d ?? '',
        features.realizedVol20d ?? '',
        features.rsi14 ?? '',
        features.macd?.value ?? '',
        features.macd?.signal ?? '',
        features.macd?.histogram ?? '',
        features.indiaVix ?? '',
        features.indiaVixMA5 ?? '',
        features.pcrVolume ?? '',
        features.pcrOI ?? '',
        features.maxPain ?? '',
        features.atmIV ?? '',
        features.volSkew ?? '',
        features.termStructure ?? '',
        snapshot.metadata.dataQuality,
        label,
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    await writeFile(filePath, csv, 'utf-8');
    this.logger.log(
      `Exported ${labeledData.length} labeled examples to ${filePath}`,
    );

    return filePath;
  }
}
