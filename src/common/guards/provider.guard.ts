import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class ProviderGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!user.isProvider) {
      throw new ForbiddenException('Provider access required');
    }

    return true;
  }
}
