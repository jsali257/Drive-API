import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination.util';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, type: NotificationType, title: string, message: string, data?: any) {
    return this.prisma.notification.create({ data: { userId, type, title, message, data } });
  }

  async findAll(userId: string, query: { page?: number; limit?: number; unreadOnly?: boolean }) {
    const { skip, take } = paginate(query);
    const where: any = { userId };
    if (query.unreadOnly) where.isRead = false;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
    ]);

    return buildPaginatedResult(data, total, query);
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }
}
