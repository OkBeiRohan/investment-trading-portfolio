export const RedisKeys = {
  /** Hash Map: instrumentKey -> socketId */
  INSTRUMENT_MAP: "upstox:sub:map",

  /** Set: Set of all active socket IDs */
  ACTIVE_SOCKETS: "upstox:sockets",

  /** Pub/Sub Channel for live ticks */
  MARKET_FEED_CHANNEL: "upstox:feed:live",

  /** Helper to generate key for a specific socket's load/metadata */
  socketMetadata: (socketId: string) => `upstox:socket:${socketId}:meta`,

  /** Helper to generate key for a specific socket's active keys set */
  socketKeys: (socketId: string) => `upstox:socket:${socketId}:keys`,
};
