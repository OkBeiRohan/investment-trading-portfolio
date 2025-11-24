import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface AuthenticatedSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  activeOrganizationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const CurrentSession = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedSession => {
    const request = ctx.switchToHttp().getRequest();
    return request.session;
  }
);
