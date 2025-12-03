import {
  All,
  Controller,
  Inject,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { AllowAnonymous } from '@repo/authentication';
import { AnyRouter } from '@trpc/server';
import { AppRouterHost } from 'nestjs-trpc';
import { renderTrpcPanel } from 'trpc-ui';

@AllowAnonymous()
@Controller('trpc')
export class TrpcController implements OnModuleInit {
  private appRouter!: AnyRouter;

  constructor(
    @Inject(AppRouterHost) private readonly appRouterHost: AppRouterHost,
  ) {}

  onModuleInit() {
    this.appRouter = this.appRouterHost.appRouter;
  }

  @All()
  panel() {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }

    console.log(this.appRouter);
    return renderTrpcPanel(this.appRouter, {
      url: 'http://localhost:3004',
      // meta: {
      //   title: 'TRPC API Panel',
      //   description: 'TRPC API Panel for Development',
      // },
    });
  }
}
