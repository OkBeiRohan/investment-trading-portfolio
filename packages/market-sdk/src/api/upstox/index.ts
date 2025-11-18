import { PlaceOrderV3Request, UpstoxClient } from '../../upstox';

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

  get upstoxClient(): UpstoxClient {
    return this.client;
  }

  setAccessToken(token: string) {
    this.client.setAccessToken(token);
  }

  async logout() {
    return this.client.logout();
  }

  async getProfile() {
    return this.client.getProfile();
  }

  async getPositions() {
    return this.client.getPositions();
  }

  async getHoldings() {
    return this.client.getHoldings();
  }

  async placeOrder(
    orderRequest: any,
    options?: { slice?: boolean },
    algoName?: string,
  ) {
    // Delegates to typed-client convenience method
    return this.client.placeOrder(orderRequest, options, algoName);
  }
}

export default UpstoxAPI;
