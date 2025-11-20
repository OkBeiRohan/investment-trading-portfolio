import * as protobuf from 'protobufjs';
import path from 'path';
import { Logger } from '@nestjs/common';

export class ProtoDecoder {
  private root?: protobuf.Root;
  private FeedResponse?: protobuf.Type;
  private isReady = false;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      // Load the proto file. In production, this should be part of the build artifacts.
      const protoPath = path.join(__dirname, '../proto/MarketDataFeedV3.proto');
      this.root = await protobuf.load(protoPath);

      // The specific namespace for V3
      this.FeedResponse = this.root.lookupType(
        'com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse',
      );
      this.isReady = true;
      Logger.log('Protobuf initialization complete.');
    } catch (e) {
      Logger.error('Failed to initialize Protobuf decoder', e);
      throw e;
    }
  }

  public decode(buffer: Buffer): any {
    if (!this.isReady || !this.FeedResponse) return null;
    try {
      const message = this.FeedResponse.decode(buffer);
      // usage of { longs: String } is crucial because JS numbers cannot hold 64-bit integers safely
      return this.FeedResponse.toObject(message, {
        longs: String,
        enums: String,
        bytes: String,
        defaults: true, // Populate missing fields with defaults
      });
    } catch (error) {
      // Common error: index out of range if proto definition doesn't match payload
      Logger.error('Protobuf Decode Error', error);
      return null;
    }
  }
}
