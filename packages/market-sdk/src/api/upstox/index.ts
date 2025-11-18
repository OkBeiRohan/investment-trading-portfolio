import { UpstoxClient } from "../../upstox";

class UpstoxAPI {
  private client: UpstoxClient;

  constructor() {
    this.client = new UpstoxClient({ sandbox: true });
    console.log("Upstox API initialized in sandbox mode.", this.client);
  }
}

export default UpstoxAPI;
