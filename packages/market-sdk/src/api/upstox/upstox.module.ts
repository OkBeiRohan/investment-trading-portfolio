import { DynamicModule, Module, Global, Provider } from '@nestjs/common';
import { UpstoxAuthService } from './services/authentication.service';
import { UpstoxStreamManager } from './services/stream-manager.service';
import { TokenStore } from './services/token-store.service';
import { UPSTOX_OPTIONS } from './constants';
import { UpstoxModuleOptions } from './interfaces/upstox-config.interface';

@Global()
@Module({})
export class UpstoxModule {
  static forRootAsync(options: {
    imports?: any[];
    useFactory: (
      ...args: any[]
    ) => Promise<UpstoxModuleOptions> | UpstoxModuleOptions;
    inject?: any[];
    // Allow the user to inject their own DB implementation
    tokenStoreClass: new (...args: any[]) => TokenStore;
  }): DynamicModule {
    const optionsProvider: Provider = {
      provide: UPSTOX_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    const tokenStoreProvider: Provider = {
      provide: TokenStore,
      useClass: options.tokenStoreClass,
    };

    return {
      module: UpstoxModule,
      imports: options.imports || [],
      providers: [
        optionsProvider,
        tokenStoreProvider,
        UpstoxAuthService,
        UpstoxStreamManager,
      ],
      exports: [UpstoxAuthService, UpstoxStreamManager],
    };
  }
}
