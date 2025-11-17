/**
 * SignalEngine Module
 * Responsible for:
 * - Loading ONNX models (onnxruntime-node)
 * - Running ML inference in TypeScript
 * - Generating trading signals
 * - Stacking ensemble predictions
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ModelLoaderService } from './model-loader.service';
import { SignalEngineService } from './signal-engine.service';

@Module({
  imports: [ConfigModule],
  providers: [ModelLoaderService, SignalEngineService],
  exports: [ModelLoaderService, SignalEngineService],
})
export class SignalEngineModule {}
