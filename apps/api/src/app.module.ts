import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TRPCModule } from 'nestjs-trpc-v2';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { AuthModule } from '@repo/authentication';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { UserModule } from './user/user.module';
import { AppContext } from './app.context';
import { AppRouter } from './app.router';
import registerConfiguration, {
  CONFIG_TOKEN,
} from './environment/configuration';
import { IEnvironment } from './environment';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [registerConfiguration] }),
    DevtoolsModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        http:
          configService.get<IEnvironment>(CONFIG_TOKEN)?.environment !==
            'production' &&
          configService.get<IEnvironment>(CONFIG_TOKEN)?.devtools === true,
      }),
      inject: [ConfigService],
    }),
    TRPCModule.forRoot({
      autoSchemaFile:
        process.env.DEVTOOLS === 'true'
          ? undefined
          : '../../packages/trpc/src/server',
      context: AppContext,
      basePath: '/api/trpc',
      transformer: 'superjson',
    }),
    AuthModule,
    HealthModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppContext, AppRouter],
})
export class AppModule {}
