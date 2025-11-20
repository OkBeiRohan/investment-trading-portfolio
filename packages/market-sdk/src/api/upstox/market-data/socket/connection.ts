import WebSocket from 'ws';
import { Logger } from '@nestjs/common';
import { ProtoDecoder } from './proto-decoder';

export class SocketConnection {
  public readonly id: string;
  private ws: WebSocket;
  private activeKeys: Set<string> = new Set();
  private readonly LIMIT = 5000; // V3 Limit

  constructor(
    id: string,
    private url: string,
    private decoder: ProtoDecoder,
    private onMessage: (data: any) => void,
  ) {
    this.id = id;

    // V3 requires binaryType = arraybuffer for Protobuf
    this.ws = new WebSocket(this.url);
    this.ws.binaryType = 'arraybuffer';

    this.ws.on('open', () => {
      Logger.log(`Socket ${this.id} connected.`);
    });

    this.ws.on('message', (data: Buffer) => {
      const decoded = this.decoder.decode(data);
      if (decoded) {
        this.onMessage(decoded);
      }
    });

    this.ws.on('error', (err) => {
      Logger.error(`Socket ${this.id} error: ${err.message}`);
      // Implement Reconnection Logic Here
    });

    this.ws.on('close', (code, reason) => {
      Logger.warn(`Socket ${this.id} closed: ${code} - ${reason}`);
      // Handle 403 or 1006 explicitly [4]
    });
  }

  public subscribe(keys: string[], mode: string = 'ltpc') {
    if (!this.hasCapacity(keys.length)) {
      throw new Error('Capacity Exceeded');
    }

    // V3 Subscription Payload
    const request = {
      guid: this.id,
      method: 'sub',
      data: {
        mode: mode,
        instrumentKeys: keys,
      },
    };

    // Upstox V3 accepts binary payload for requests.
    // While some docs suggest JSON is accepted, best practice is binary.
    // For simplicity in this example, we send Buffer of JSON as widely supported by V3 servers.
    this.ws.send(Buffer.from(JSON.stringify(request)));

    keys.forEach((k) => this.activeKeys.add(k));
  }

  public hasCapacity(count: number = 1): boolean {
    return this.activeKeys.size + count <= this.LIMIT;
  }

  public getLoad(): number {
    return this.activeKeys.size;
  }
}
