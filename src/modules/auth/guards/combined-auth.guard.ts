import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Accepts either a valid JWT Bearer token OR a valid X-API-Key header
@Injectable()
export class CombinedAuthGuard implements CanActivate {
  private jwtGuard = new (AuthGuard('jwt'))();
  private apiKeyGuard = new (AuthGuard('api-key'))();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const hasBearer = !!req.headers['authorization']?.startsWith('Bearer ');
    const hasApiKey = !!req.headers['x-api-key'];

    if (!hasBearer && !hasApiKey) {
      throw new UnauthorizedException('Authentication required: provide Bearer token or X-API-Key');
    }

    try {
      if (hasBearer) {
        return (await this.jwtGuard.canActivate(context)) as boolean;
      }
    } catch {}

    try {
      if (hasApiKey) {
        return (await this.apiKeyGuard.canActivate(context)) as boolean;
      }
    } catch {}

    throw new UnauthorizedException('Invalid credentials');
  }
}
