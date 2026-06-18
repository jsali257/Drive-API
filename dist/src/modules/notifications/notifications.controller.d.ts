import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(userId: string, query: any): Promise<import("../../common/utils/pagination.util").PaginatedResult<{
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
    unreadCount(userId: string): Promise<{
        count: number;
    }>;
    markRead(id: string, userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAllRead(userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
