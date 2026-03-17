import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { UserRepository } from "@repo/database";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly userRepo: UserRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const session = request.session;

    if (!session?.user?.id) {
      throw new ForbiddenException("Authentication required");
    }

    const user = await this.userRepo.findById(session.user.id);
    if (!user || user.role !== "Admin") {
      throw new ForbiddenException("Admin access required");
    }

    return true;
  }
}
