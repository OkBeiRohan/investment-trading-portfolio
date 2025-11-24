import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { AuthService } from "../services/auth.service";

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const session = request.session;
    const user = request.user;

    if (!session || !user) {
      throw new ForbiddenException("User not authenticated");
    }

    const organizationId =
      request.params.organizationId ||
      request.query.organizationId ||
      session.activeOrganizationId;

    if (!organizationId) {
      throw new ForbiddenException("No organization context provided");
    }

    try {
      const organization =
        await this.authService.getOrganization(organizationId);

      if (!organization) {
        throw new ForbiddenException("Organization not found or access denied");
      }

      // Attach organization to request
      request.organization = organization;

      return true;
    } catch {
      throw new ForbiddenException("Failed to verify organization access");
    }
  }
}
