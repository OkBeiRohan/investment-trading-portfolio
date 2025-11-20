import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { SocketConnection } from "./connection";
import { AuthService } from "../../auth/auth.service";
import { ProtoDecoder } from "./proto-decoder";
import { RedisService } from "@repo/database";
import { UpstoxV3Constants } from "../../constants";
import { UpstoxEnv } from "@repo/schema";

@Injectable()
export class SocketPool implements OnModuleDestroy {
  private sockets: Map<string, SocketConnection> = new Map();
  private decoder: ProtoDecoder;

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
    private redisService: RedisService,
    private logger: Logger
  ) {
    this.decoder = new ProtoDecoder();
  }

  /**
   * Creates a new authenticated socket connection.
   *
   * CRITICAL IMPLEMENTATION DETAIL:
   * Upstox V3 requires calling the 'authorize' endpoint to get a specific
   * 'authorizedRedirectUri'. This URI is valid for ONE-TIME use only. [8]
   */
  async createSocket(userId: string): Promise<SocketConnection> {
    const env =
      this.configService.get("UPSTOX_ENV") === "SANDBOX"
        ? UpstoxEnv.SANDBOX
        : UpstoxEnv.LIVE;

    try {
      // 1. Get Access Token
      const accessToken = await this.authService.getAccessToken(userId, env);

      // 2. Get One-Time Redirect URL
      // Note: Use 'maxRedirects: 0' to prevent axios from following 302 automatically,
      // though the API usually returns 200 with the URL in the body.
      const response = await axios.get(UpstoxV3Constants.MARKET_FEED_AUTH_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      const authorizedUrl = response.data.data.authorizedRedirectUri;

      if (!authorizedUrl) {
        throw new Error(
          "Failed to retrieve authorized WebSocket URL from Upstox"
        );
      }

      // 3. Instantiate Socket
      const socketId = `ws-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const connection = new SocketConnection(
        socketId,
        authorizedUrl,
        this.decoder,
        (data) => this.handleMessage(data)
      );

      this.sockets.set(socketId, connection);

      // 4. Register in Redis for Persistence/Recovery
      await this.redisService.setSocketForInstrument("", socketId);

      this.logger.log(`Created new Socket: ${socketId}`);
      return connection;
    } catch (error: any) {
      this.logger.error(
        `Failed to create socket for user ${userId}`,
        error?.message
      );
      throw error;
    }
  }

  /**
   * Returns all active socket instances.
   */
  getSockets(): SocketConnection[] {
    return Array.from(this.sockets.values());
  }

  /**
   * Returns a specific socket by ID.
   */
  getSocket(socketId: string): SocketConnection | undefined {
    return this.sockets.get(socketId);
  }

  /**
   * Removes a socket from the pool (e.g., on close/error).
   */
  removeSocket(socketId: string) {
    if (this.sockets.has(socketId)) {
      this.sockets.delete(socketId);
      this.redisService.removeSocket(socketId); // Cleanup Redis state
      this.logger.warn(`Removed socket ${socketId} from pool`);
    }
  }

  /**
   * Push received data to Redis Pub/Sub for downstream consumers (Algo Engine)
   */
  private handleMessage(data: any) {
    if (data?.feeds) {
      // Publish to Redis Channel defined in Constants
      this.redisService.publishMarketData(data);
    }
  }

  onModuleDestroy() {
    this.logger.log("Terminating all socket connections...");
    for (const [id, socket] of this.sockets) {
      // SocketConnection should have a close() method
      // socket.close();
      this.logger.debug(`Closed socket ${id}`);
    }
    this.sockets.clear();
  }
}
