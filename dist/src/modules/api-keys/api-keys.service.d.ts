import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
export declare class ApiKeysService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: string, data: {
        name: string;
        permissions?: string[];
        allowedIps?: string[];
        rateLimitPerMin?: number;
        expiresAt?: Date;
        description?: string;
    }): Promise<{
        key: string;
        message: string;
        name: string;
        description: string | null;
        id: string;
        status: import(".prisma/client").$Enums.ApiKeyStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        expiresAt: Date | null;
        keyHash: string;
        keyPrefix: string;
        permissions: string[];
        allowedIps: string[];
        rateLimitPerMin: number;
        lastUsedAt: Date | null;
        lastUsedIp: string | null;
        usageCount: bigint;
        revokedAt: Date | null;
    }>;
    findAll(userId: string, userRole: UserRole, query: {
        page?: number;
        limit?: number;
    }): Promise<import("../../common/utils/pagination.util").PaginatedResult<{
        user: {
            email: string;
            username: string;
        };
        name: string;
        description: string | null;
        id: string;
        status: import(".prisma/client").$Enums.ApiKeyStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        expiresAt: Date | null;
        keyPrefix: string;
        permissions: string[];
        allowedIps: string[];
        rateLimitPerMin: number;
        lastUsedAt: Date | null;
        lastUsedIp: string | null;
        usageCount: bigint;
        revokedAt: Date | null;
    }>>;
    revoke(id: string, userId: string, userRole: UserRole): Promise<{
        name: string;
        description: string | null;
        id: string;
        status: import(".prisma/client").$Enums.ApiKeyStatus;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        expiresAt: Date | null;
        keyPrefix: string;
        permissions: string[];
        allowedIps: string[];
        rateLimitPerMin: number;
        lastUsedAt: Date | null;
        lastUsedIp: string | null;
        usageCount: bigint;
        revokedAt: Date | null;
    }>;
    delete(id: string, userId: string, userRole: UserRole): Promise<{
        message: string;
    }>;
    getUsageStats(id: string, userId: string, userRole: UserRole): Promise<{
        key: {
            id: string;
            name: string;
            usageCount: bigint;
            lastUsedAt: Date | null;
        };
        recentActivity: {
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
        }[];
    }>;
}
