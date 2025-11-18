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
import { PersistenceModule } from '../../persistence/persistence.module';
import { ModelLoaderService } from './model-loader.service';
import { SignalEngineService } from './signal-engine.service';
import { PythonInferenceService } from './python-inference.service';

@Module({
  imports: [ConfigModule, PersistenceModule],
  providers: [ModelLoaderService, SignalEngineService, PythonInferenceService],
  exports: [ModelLoaderService, SignalEngineService, PythonInferenceService],
})
export class SignalEngineModule {}
