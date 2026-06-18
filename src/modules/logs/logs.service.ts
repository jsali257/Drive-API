import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination.util';

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async getAuditLogs(
    userId: string,
    userRole: UserRole,
    query: { page?: number; limit?: number; action?: string; userId?: string; dateFrom?: string; dateTo?: string },
  ) {
    const { skip, take } = paginate(query);
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
    const where: any = {};

    if (!isAdmin) where.userId = userId;
    else if (query.userId) where.userId = query.userId;

    if (query.action) where.action = query.action;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, username: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return buildPaginatedResult(data, total, query);
  }

  async getActivityLogs(
    userId: string,
    userRole: UserRole,
    query: { page?: number; limit?: number; action?: string; userId?: string },
  ) {
    const { skip, take } = paginate(query);
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
    const where: any = {};

    if (!isAdmin) where.userId = userId;
    else if (query.userId) where.userId = query.userId;
    if (query.action) where.action = query.action;

    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, username: true } } },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return buildPaginatedResult(data, total, query);
  }
}
