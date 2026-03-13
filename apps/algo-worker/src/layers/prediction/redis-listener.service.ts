import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InferenceWorkerService } from './inference-worker.service';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisFeatureListenerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RedisFeatureListenerService.name);
  private subscriberClient: Redis;
  private readonly CONSUMER_GROUP = 'algo-worker-group';
  private readonly CONSUMER_NAME = `worker-${Math.random().toString(36).substring(7)}`;
  private readonly STREAM_KEY = 'market.features.live';

  constructor(
    private readonly inferenceService: InferenceWorkerService,
    private readonly configService: ConfigService
  ) {}

  onApplicationBootstrap() {
    this.logger.log('Bootstrapping Redis Stream Listener for Real-Time Features...');
    
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.subscriberClient = new Redis(redisUrl);
    
    this.initStreamConsumer().catch(err => {
      this.logger.error(`Failed to initialize stream consumer: ${err.message}`, err.stack);
    });
  }

  private async initStreamConsumer() {
    try {
      // Create Consumer Group if it doesn't exist
      await this.subscriberClient.xgroup('CREATE', this.STREAM_KEY, this.CONSUMER_GROUP, '$', 'MKSTREAM');
      this.logger.log(`Created consumer group ${this.CONSUMER_GROUP} for stream ${this.STREAM_KEY}`);
    } catch (err: any) {
      if (!err.message.includes('BUSYGROUP')) {
        throw err;
      }
    }

    this.logger.log(`Started polling ${this.STREAM_KEY} as ${this.CONSUMER_NAME}`);
    this.pollStream();
  }

  private async pollStream() {
    while (true) {
      try {
        // Block for 2 seconds waiting for new features
        const messages = await this.subscriberClient.xreadgroup(
          'GROUP', this.CONSUMER_GROUP, this.CONSUMER_NAME,
          'BLOCK', 2000,
          'STREAMS', this.STREAM_KEY, '>'
        );

        if (messages) {
          for (const stream of (messages as any[])) {
            const streamId = stream[0];
            const entries = stream[1] as any[];

            for (const entry of entries) {
              const msgId = entry[0];
              const fields = entry[1];
              
              // Parse the message array pairs into an object
              const payload: Record<string, string> = {};
              for (let i = 0; i < fields.length; i += 2) {
                payload[fields[i] as string] = fields[i + 1] as string;
              }

              await this.processMessage(payload, msgId);
            }
          }
        }
      } catch (error: any) {
        this.logger.error(`Error polling redis stream: ${error.message}`, error.stack);
        // Small backoff before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  private async processMessage(payload: Record<string, string>, msgId: string) {
    const { instrumentKey, timestamp, featuresJson } = payload;
    
    if (!instrumentKey || !timestamp || !featuresJson) {
       await this.subscriberClient.xack(this.STREAM_KEY, this.CONSUMER_GROUP, msgId);
       return;
    }

    try {
      const features = JSON.parse(featuresJson) as number[];
      
      // Pass the 117-feature array to the ONNX Ensembler
      const inferenceResult = await this.inferenceService.executeEnsemble(
        instrumentKey,
        timestamp,
        features
      );

      this.logger.debug(
        `[O:${inferenceResult.latencyMs.toFixed(2)}ms] Sig: ${inferenceResult.finalScore.toFixed(3)} for ${instrumentKey}`
      );
      
      // TODO: Emit Signal over internal Event Bus (Layer 4)

      // Acknowledge the message so it doesn't get reprocessed
      await this.subscriberClient.xack(this.STREAM_KEY, this.CONSUMER_GROUP, msgId);

    } catch (err: any) {
      this.logger.error(`Failed to process inference for ${instrumentKey}: ${err.message}`, err.stack);
    }
  }
}
