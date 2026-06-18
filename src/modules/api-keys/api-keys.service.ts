import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction, UserRole } from '@prisma/client';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination.util';

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    data: { name: string; permissions?: string[]; allowedIps?: string[]; rateLimitPerMin?: number; expiresAt?: Date; description?: string },
  ) {
    const rawKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 12);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId,
        name: data.name,
        keyHash,
        keyPrefix,
        permissions: data.permissions || [],
        allowedIps: data.allowedIps || [],
        rateLimitPerMin: data.rateLimitPerMin || 60,
        expiresAt: data.expiresAt ? new Date(data.expiresAt as unknown as string) : undefined,
        description: data.description || undefined,
      },
    });

    await this.prisma.auditLog.create({ data: { userId, action: AuditAction.API_KEY_CREATED, resourceId: apiKey.id } });

    return {
      ...apiKey,
      key: rawKey,
      message: 'Save this key — it will not be shown again',
    };
  }

  async findAll(userId: string, userRole: UserRole, query: { page?: number; limit?: number }) {
    const { skip, take } = paginate(query);
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
    const where = isAdmin ? {} : { userId };

    const [data, total] = await Promise.all([
      this.prisma.apiKey.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, username: true } } },
      }),
      this.prisma.apiKey.count({ where }),
    ]);

    const sanitized = data.map(({ keyHash, ...k }) => k);
    return buildPaginatedResult(sanitized, total, query);
  }

  async revoke(id: string, userId: string, userRole: UserRole) {
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
    const key = await this.prisma.apiKey.findFirst({ where: { id, ...(isAdmin ? {} : { userId }) } });
    if (!key) throw new NotFoundException('API key not found');

    const updated = await this.prisma.apiKey.update({
      where: { id },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    await this.prisma.auditLog.create({ data: { userId, action: AuditAction.API_KEY_REVOKED, resourceId: id } });
    const { keyHash, ...safe } = updated;
    return safe;
  }

  async delete(id: string, userId: string, userRole: UserRole) {
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
    const key = await this.prisma.apiKey.findFirst({ where: { id, ...(isAdmin ? {} : { userId }) } });
    if (!key) throw new NotFoundException('API key not found');
    await this.prisma.apiKey.delete({ where: { id } });
    return { message: 'API key deleted' };
  }

  async getUsageStats(id: string, userId: string, userRole: UserRole) {
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
    const key = await this.prisma.apiKey.findFirst({ where: { id, ...(isAdmin ? {} : { userId }) } });
    if (!key) throw new NotFoundException('API key not found');

    const logs = await this.prisma.activityLog.findMany({
      where: { apiKeyId: id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return { key: { id: key.id, name: key.name, usageCount: key.usageCount, lastUsedAt: key.lastUsedAt }, recentActivity: logs };
  }
}
