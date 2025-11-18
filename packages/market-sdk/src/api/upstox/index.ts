import { UpstoxClient } from '../../upstox';

class UpstoxAPI {
  private client: UpstoxClient;

  constructor() {
    this.client = new UpstoxClient({
      apiKey: process.env.UPSTOX_API_KEY || '',
      apiSecret: process.env.UPSTOX_API_SECRET || '',
      accessToken: process.env.UPSTOX_ACCESS_TOKEN || '',
      sandbox: process.env.UPSTOX_SANDBOX === 'true',
    });
  }

  setAccessToken(token: string) {
    this.client.setAccessToken(token);
  }

  async logout() {
    return this.client.logout();
  }
}

export default UpstoxAPI;
