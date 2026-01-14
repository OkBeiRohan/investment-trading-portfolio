import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export default class UpstoxClient {
  private readonly logger = new Logger(UpstoxClient.name);

  constructor(private readonly upstoxApiService: HttpService) {}
}
