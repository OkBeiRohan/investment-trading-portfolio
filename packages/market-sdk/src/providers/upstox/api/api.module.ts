import { Module } from "@nestjs/common";
import { AuthenticationModule } from "./authentication/api/authentication.module";
import { HttpModule } from "@nestjs/axios";
import UpstoxHttpConfigService from "./config/http-config.service";

@Module({
  imports: [
    HttpModule.registerAsync({
      useClass: UpstoxHttpConfigService,
    }),
    AuthenticationModule,
  ],
  providers: [],
  exports: [],
})
export class UpstoxApiModule {}
