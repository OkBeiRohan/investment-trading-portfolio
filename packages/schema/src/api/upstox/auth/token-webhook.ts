/**
 * Upstox Notifier Webhook Payload
 * Sent by Upstox when user approves access token request
 * https://upstox.com/developer/api-documentation/access-token-request#notifier-webhook
 */
export interface IUpstoxNotifierWebhook {
  /** The API key (client_id) */
  client_id: string;
  /** Upstox user ID (UCC) */
  user_id: string;
  /** Generated access token */
  access_token: string;
  /** Token type (e.g., "Bearer") */
  token_type: string;
  /** Expiry timestamp in milliseconds */
  expires_at: string;
  /** Issued timestamp in milliseconds */
  issued_at: string;
  /** Message type identifier */
  message_type: "access_token";
}

/**
 * Access Token Request Response
 * https://upstox.com/developer/api-documentation/access-token-request
 */
export interface IUpstoxAccessTokenRequest {
  status: "success";
  data: {
    /** Expiration time for the request (next day 3:30 AM) */
    authorization_expiry: string;
    /** The configured notifier webhook URL */
    notifier_url: string;
  };
}
