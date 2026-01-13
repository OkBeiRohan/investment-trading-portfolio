import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execAsync = promisify(exec);

/**
 * Compute Engine Service
 *
 * TypeScript wrapper for Rust compute-engine binary.
 * Handles feature calculation using high-performance Rust code.
 *
 * Features computed (33 total):
 * - Market Structure (8): price vs VWAP, highs/lows, range position
 * - Momentum & Trend (8): RSI, MACD, EMA slopes, ADX, ROC
 * - Volatility (5): ATR, realized vol, vol expansion, India VIX
 * - Options (9): ATM IV, Greeks, PCR, max pain distance
 * - Time Context (3): minutes from open, to close, day of week
 */
@Injectable()
export class ComputeEngineService {
  private readonly logger = new Logger(ComputeEngineService.name);
  private readonly computeEnginePath: string;

  constructor() {
    // Path to compiled Rust binary
    this.computeEnginePath = join(
      process.cwd(),
      '..',
      '..',
      'services',
      'compute-engine',
      'target',
      'release',
      process.platform === 'win32' ? 'compute-engine.exe' : 'compute-engine',
    );
  }

  /**
   * Compute features for a batch of market data
   *
   * @param inputData - Array of market tick/candle data
   * @returns Array of feature vectors (33 features each)
   *
   * Input format: { timestamp, open, high, low, close, volume, ... }
   * Output format: { timestamp, feature_0, feature_1, ..., feature_32 }
   */
  async computeFeatures(inputData: any[]): Promise<any[]> {
    try {
      this.logger.debug(
        `Computing features for ${inputData.length} data points`,
      );

      // TODO: Replace with direct Rust binding (NAPI-RS) for zero-copy performance
      // Current approach: JSON serialization (temporary solution)

      // Write input to temp file
      const tempInputPath = join(process.cwd(), 'temp_input.json');
      const tempOutputPath = join(process.cwd(), 'temp_output.json');

      const fs = await import('fs/promises');
      await fs.writeFile(tempInputPath, JSON.stringify(inputData));

      // Call Rust binary
      const { stdout, stderr } = await execAsync(
        `"${this.computeEnginePath}" --input "${tempInputPath}" --output "${tempOutputPath}"`,
      );

      if (stderr) {
        this.logger.warn(`Compute engine stderr: ${stderr}`);
      }

      // Read output
      const outputData = await fs.readFile(tempOutputPath, 'utf-8');
      const features = JSON.parse(outputData);

      // Cleanup temp files
      await fs.unlink(tempInputPath);
      await fs.unlink(tempOutputPath);

      this.logger.debug(
        `Features computed: ${features.length} rows × 33 features`,
      );

      return features;
    } catch (error) {
      this.logger.error('Feature computation failed', error);
      throw error;
    }
  }

  /**
   * Health check: Verify compute-engine binary is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `"${this.computeEnginePath}" --version`,
      );
      this.logger.log(`Compute engine version: ${stdout.trim()}`);
      return true;
    } catch (error) {
      this.logger.error(
        'Compute engine binary not found or not executable',
        error,
      );
      return false;
    }
  }
}
