import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(req: Request) {
    const key = req.headers['x-api-key'] as string;
    if (!key) throw new UnauthorizedException('API key missing');

    const ip = req.ip || req.socket?.remoteAddress;
    const user = await this.authService.validateApiKey(key, ip);
    if (!user) throw new UnauthorizedException('Invalid or expired API key');
    return user;
  }
}
