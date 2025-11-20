import { Injectable, Logger } from '@nestjs/common';
import { SocketConnection } from './socket/connection';
import { AuthService } from '../auth/auth.service';
import { RedisService } from '@repo/database';
import { ProtoDecoder } from './socket/proto-decoder';
import axios from 'axios';

@Injectable()
export class MultiplexerService {
  private sockets: SocketConnection[] = [];
  private readonly MAX_SOCKETS = 5;

  constructor(
    private authService: AuthService,
    private redis: RedisService,
    private logger: Logger,
  ) {}

  async subscribe(instrumentKeys: string) {
    // 1. Separate keys that are already subscribed
    const newKeys: string[] = [];
    for (const key of instrumentKeys) {
      const assignedSocket = await this.redis.getSocketForInstrument(key);
      if (!assignedSocket) newKeys.push(key); 
    }

    if (newKeys.length === 0) return;

    // 2. Bin Packing Allocation
    for (const key of newKeys) {
      let allocated = false;
      
      // Try to fit in existing sockets (First-Fit)
      for (const socket of this.sockets) {
        if (socket.hasCapacity(1)) {
          socket.subscribe([key]);
          await this.redis.setSocketForInstrument(key, socket.id);
          allocated = true;
          break;
        }
      }

      // If not allocated, try to create a new socket
      if (!allocated) {
        if (this.sockets.length < this.MAX_SOCKETS) {
          const newSocket = await this.createSocket();
          newSocket.subscribe([key]);
          await this.redis.setSocketForInstrument(key, newSocket.id);
          this.sockets.push(newSocket);
        } else {
          // Overflow: Add to Priority Queue (Not implemented in this snippet)
          this.logger.warn(`Dropped subscription for ${key}: Capacity Reached`);
        }
      }
    }
  }

  private async createSocket(): Promise<SocketConnection> {
    const token = await this.authService.getAccessToken();
    
    // Get Authorized URL [15]
    const response = await axios.get('https://api.upstox.com/v3/feed/market-data-feed/authorize', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const url = response.data.data.authorizedRedirectUri;
    
    return new SocketConnection(
      `socket-${Date.now()}`, 
      url, 
      new ProtoDecoder(), 
      (data) => this.handleData(data)
    );
  }

  private handleData(data: any) {
    // Push to Redis Pub/Sub for consuming apps
    this.redis.publishMarketData(data);
  }
}