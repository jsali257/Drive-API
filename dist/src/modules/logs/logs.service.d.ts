import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
export declare class LogsService {
    private prisma;
    constructor(prisma: PrismaService);
    getAuditLogs(userId: string, userRole: UserRole, query: {
        page?: number;
        limit?: number;
        action?: string;
        userId?: string;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<import("../../common/utils/pagination.util").PaginatedResult<{
        user: {
            email: string;
            username: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        userId: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        action: import(".prisma/client").$Enums.AuditAction;
        resource: string | null;
        resourceId: string | null;
        details: import("@prisma/client/runtime/library").JsonValue | null;
        success: boolean;
    }>>;
    getActivityLogs(userId: string, userRole: UserRole, query: {
        page?: number;
        limit?: number;
        action?: string;
        userId?: string;
    }): Promise<import("../../common/utils/pagination.util").PaginatedResult<{
        user: {
            email: string;
            username: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        userId: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        action: string;
        resource: string | null;
        resourceId: string | null;
        details: import("@prisma/client/runtime/library").JsonValue | null;
        method: string | null;
        path: string | null;
        statusCode: number | null;
        duration: number | null;
        apiKeyId: string | null;
    }>>;
}
