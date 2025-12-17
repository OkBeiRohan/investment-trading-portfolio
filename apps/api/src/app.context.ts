import { Injectable } from '@nestjs/common';
import { ContextOptions, TRPCContext } from '@mguay/nestjs-trpc';

@Injectable()
export class AppContext implements TRPCContext {
  constructor() {}

  create(opts: ContextOptions): Record<string, unknown> {
    return {
      req: opts.req,
      res: opts.res,
    };
  }
}
