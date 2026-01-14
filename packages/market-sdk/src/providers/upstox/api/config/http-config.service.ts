import { HttpModuleOptions, HttpModuleOptionsFactory } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { UPSTOX_CONSTANTS } from "../../constants";

@Injectable()
export default class UpstoxHttpConfigService implements HttpModuleOptionsFactory {
  createHttpOptions(): Promise<HttpModuleOptions> | HttpModuleOptions {
    return {
      baseURL: UPSTOX_CONSTANTS.API.BASE_URL,
      timeout: 30000,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    };
  }
}
