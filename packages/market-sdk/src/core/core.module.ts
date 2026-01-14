import { Module, Global } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { HttpClientService } from "./http-client.service";
import { RateLimiterModule } from "../rate-limiter/rate-limiter.module";
import { CircuitBreakerService } from "../utils/circuit-breaker";

@Global()
@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    RateLimiterModule,
  ],
  providers: [HttpClientService, CircuitBreakerService],
  exports: [HttpClientService, CircuitBreakerService],
})
export class CoreModule {}
