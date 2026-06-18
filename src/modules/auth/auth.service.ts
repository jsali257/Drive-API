import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { addMinutes, addDays } from 'date-fns';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuditAction, UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });

    if (!user) {
      await this.logAudit(null, AuditAction.LOGIN_FAILED, ip, { email: dto.email });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Account suspended');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(
        `Account locked until ${user.lockedUntil.toISOString()}`,
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      const maxAttempts = this.config.get<number>('security.maxLoginAttempts', 5);
      const newAttempts = user.loginAttempts + 1;
      const lockout =
        newAttempts >= maxAttempts
          ? addMinutes(new Date(), this.config.get<number>('security.lockoutMinutes', 15))
          : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: newAttempts, lockedUntil: lockout },
      });

      await this.logAudit(user.id, AuditAction.LOGIN_FAILED, ip, { attempts: newAttempts });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: ip },
    });

    const tokens = await this.generateTokens(user.id, ip, userAgent);
    await this.logAudit(user.id, AuditAction.LOGIN, ip, {});

    return { ...tokens, user: this.sanitizeUser(user) };
  }

  async register(dto: RegisterDto, ip?: string) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email.toLowerCase() }, { username: dto.username.toLowerCase() }] },
    });

    if (existing) {
      throw new ConflictException(
        existing.email === dto.email.toLowerCase() ? 'Email already in use' : 'Username already taken',
      );
    }

    const rounds = this.config.get<number>('security.bcryptRounds', 12);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        username: dto.username.toLowerCase(),
        displayName: dto.displayName || dto.username,
        passwordHash,
      },
    });

    await this.logAudit(user.id, AuditAction.USER_CREATED, ip, {});
    const tokens = await this.generateTokens(user.id, ip);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  async refreshTokens(refreshToken: string, ip?: string) {
    const hash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });

    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } });

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return this.generateTokens(user.id, ip);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const hash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: hash, userId },
        data: { isRevoked: true },
      });
    }
    await this.logAudit(userId, AuditAction.LOGOUT, undefined, {});
  }

  async validateApiKey(rawKey: string, ip?: string) {
    const prefix = rawKey.substring(0, 12);
    const hash = this.hashToken(rawKey);

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash: hash },
      include: { user: true },
    });

    if (!apiKey || apiKey.status !== 'ACTIVE') return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;
    if (apiKey.allowedIps.length > 0 && ip && !apiKey.allowedIps.includes(ip)) return null;

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date(), lastUsedIp: ip, usageCount: { increment: 1 } },
    });

    return { ...apiKey.user, apiKeyId: apiKey.id, apiKeyPermissions: apiKey.permissions };
  }

  private async generateTokens(userId: string, ip?: string, userAgent?: string) {
    const accessToken = this.jwt.sign(
      { sub: userId, type: 'access' },
      {
        secret: this.config.get<string>('jwt.secret'),
        expiresIn: this.config.get<string>('jwt.expiresIn'),
      },
    );

    const rawRefresh = crypto.randomBytes(64).toString('hex');
    const refreshHash = this.hashToken(rawRefresh);
    const refreshExpiry = addDays(new Date(), 7);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: refreshHash,
        ipAddress: ip,
        userAgent,
        expiresAt: refreshExpiry,
      },
    });

    return { accessToken, refreshToken: rawRefresh };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private sanitizeUser(user: any) {
    const { passwordHash, twoFactorSecret, emailVerifyToken, resetPasswordToken, ...safe } = user;
    return safe;
  }

  private async logAudit(userId: string | null, action: AuditAction, ip?: string, details?: any) {
    await this.prisma.auditLog.create({
      data: { userId, action, ipAddress: ip, details, success: action !== AuditAction.LOGIN_FAILED },
    });
  }
}
