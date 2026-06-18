import { UserRole } from '@prisma/client';
import { LogsService } from './logs.service';
export declare class LogsController {
    private logsService;
    constructor(logsService: LogsService);
    getAuditLogs(userId: string, role: UserRole, query: any): Promise<import("../../common/utils/pagination.util").PaginatedResult<{
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
    getActivityLogs(userId: string, role: UserRole, query: any): Promise<import("../../common/utils/pagination.util").PaginatedResult<{
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
