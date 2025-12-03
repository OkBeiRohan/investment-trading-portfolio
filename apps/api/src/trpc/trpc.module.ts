import { Module } from '@nestjs/common';
import { TrpcController } from './trpc.controller';
import { TRPCModule } from 'nestjs-trpc';

@Module({
  imports: [
    TRPCModule.forRoot({
      autoSchemaFile:
        process.env.DEVTOOLS === 'true'
          ? undefined
          : '../../packages/trpc/src/server',
    }),
  ],
  controllers: [TrpcController],
  providers: [],
})
export class TrpcModule {}
