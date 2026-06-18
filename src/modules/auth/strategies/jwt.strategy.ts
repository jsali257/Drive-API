import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret'),
    });
  }

  async validate(payload: { sub: string; type: string }) {
    if (payload.type !== 'access') throw new UnauthorizedException('Invalid token type');

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        status: true,
        avatar: true,
        storageQuotaBytes: true,
        storageUsedBytes: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('User not found or inactive');
    return user;
  }
}
