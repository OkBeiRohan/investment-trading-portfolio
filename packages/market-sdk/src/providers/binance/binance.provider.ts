import { Injectable } from "@nestjs/common";
import { AuthManagerService } from "@repo/authentication";

@Injectable()
export class BinanceProvider {
  constructor(private authManager: AuthManagerService) {}
}
