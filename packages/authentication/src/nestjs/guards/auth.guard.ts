import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthService } from "../auth.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Extract token from cookie
    const token = this.extractTokenFromCookie(request);

    if (!token) {
      throw new UnauthorizedException("No authentication token provided");
    }

    try {
      const result = await this.authService.verifySession(token);

      if (!result) {
        throw new UnauthorizedException("Invalid or expired session");
      }

      // Attach user and session to request
      request.user = result.user;
      request.session = result.session;

      return true;
    } catch {
      throw new UnauthorizedException("Authentication failed");
    }
  }

  private extractTokenFromCookie(request: any): string | undefined {
    const cookies = request.cookies || {};
    return cookies["better-auth.session_token"];
  }
}
