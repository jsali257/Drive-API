import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
export declare class NotificationsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: string, type: NotificationType, title: string, message: string, data?: any): Promise<{
        type: import(".prisma/client").$Enums.NotificationType;
        title: string;
        message: string;
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        userId: string;
        isRead: boolean;
        readAt: Date | null;
    }>;
    findAll(userId: string, query: {
        page?: number;
        limit?: number;
        unreadOnly?: boolean;
    }): Promise<import("../../common/utils/pagination.util").PaginatedResult<{
        type: import(".prisma/client").$Enums.NotificationType;
        title: string;
        message: string;
        id: string;
        createdAt: Date;
        data: import("@prisma/client/runtime/library").JsonValue | null;
        userId: string;
        isRead: boolean;
        readAt: Date | null;
    }>>;
    markRead(id: string, userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAllRead(userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    getUnreadCount(userId: string): Promise<number>;
}
