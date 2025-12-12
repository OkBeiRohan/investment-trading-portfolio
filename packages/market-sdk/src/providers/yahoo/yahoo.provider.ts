import { Injectable } from "@nestjs/common";
import { AuthManagerService } from "../../auth/auth-manager.service";

@Injectable()
export class YahooProvider {
  constructor(private authManager: AuthManagerService) {}
}
