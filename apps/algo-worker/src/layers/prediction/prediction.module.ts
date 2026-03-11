import { Module } from '@nestjs/common';
import { ModelPoolService } from './model-pool.service';
import { InferenceWorkerService } from './inference-worker.service';
import { RedisFeatureListenerService } from './redis-listener.service';

@Module({
  providers: [ModelPoolService, InferenceWorkerService, RedisFeatureListenerService],
  exports: [InferenceWorkerService],
})
export class PredictionModule {}
