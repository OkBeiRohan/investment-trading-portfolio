import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthStrategy } from './auth.strategy';

@Injectable()
export class SandboxAuthStrategy implements AuthStrategy {
  private readonly logger = new Logger(SandboxAuthStrategy.name);

  constructor(private configService: ConfigService) {}

  async getAccessToken(): Promise<string> {
    const token = this.configService.get<string>('UPSTOX_SANDBOX_TOKEN');
    if (!token) {
      this.logger.error(
        'Sandbox token missing. Generate via Developer Dashboard.',
      );
      throw new Error('SANDBOX_TOKEN_MISSING');
    }
    // Sandbox tokens do not require renewal logic in the code
    // as they are manually generated for testing sessions.
    return token;
  }
}
