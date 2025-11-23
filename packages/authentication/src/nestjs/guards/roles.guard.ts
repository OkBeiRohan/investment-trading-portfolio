import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const organization = request.organization;

    if (!organization || !organization.members) {
      throw new ForbiddenException(
        "Organization context required for role check"
      );
    }

    const userMember = organization.members.find(
      (member: any) => member.userId === request.user.id
    );

    if (!userMember) {
      throw new ForbiddenException("User is not a member of this organization");
    }

    const hasRole = requiredRoles.some((role) =>
      userMember.role.split(",").includes(role)
    );

    if (!hasRole) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }
}
