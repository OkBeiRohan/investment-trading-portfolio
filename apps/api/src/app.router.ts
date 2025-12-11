import { AllowAnonymous } from '@repo/authentication';
import { Query, Router } from 'nestjs-trpc-v2';
import { AppService } from './app.service';
import z from 'zod';

@AllowAnonymous()
@Router({ alias: 'api' })
export class AppRouter {
  constructor(private readonly appService: AppService) {}

  @Query({ input: z.null().optional(), output: z.string() })
  getVersion() {
    return this.appService.getVersion();
  }

  @Query({ input: z.null().optional(), output: z.object({ url: z.string() }) })
  getFrontendUrl() {
    return this.appService.getFrontendUrl();
  }
}
