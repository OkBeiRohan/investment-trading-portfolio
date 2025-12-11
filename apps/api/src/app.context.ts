import { Injectable } from '@nestjs/common';
import { ContextOptions, TRPCContext } from 'nestjs-trpc-v2';

@Injectable()
export class AppContext implements TRPCContext {
  constructor() {}

  async create(opts: ContextOptions): Promise<Record<string, unknown>> {
    return {
      req: opts.req,
      res: opts.res,
    };
  }
}
