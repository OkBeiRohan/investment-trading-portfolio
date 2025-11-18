import { UpstoxClient } from "upstox-js-sdk";

class UpstoxAPI {
  private client: UpstoxClient;

  constructor() {
    this.client = new UpstoxClient(true);
  }
}

export default UpstoxAPI;
