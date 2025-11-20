export interface AuthStrategy {
  getAccessToken(userId?: string): Promise<string>;
  handleCallback?(code: string, config?: any): Promise<void>;
}
