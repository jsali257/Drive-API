import { PrismaService } from '../../prisma/prisma.service';
export declare class StorageStatsService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboardStats(): Promise<{
        totalFiles: number;
        totalUsers: number;
        activeApiKeys: number;
        storageUsedBytes: bigint;
        uploadsToday: number;
        downloadsToday: number;
        topDownloadedFiles: {
            id: string;
            originalName: string;
            mimeType: string;
            size: bigint;
            downloadCount: bigint;
        }[];
        largestFiles: {
            id: string;
            originalName: string;
            mimeType: string;
            size: bigint;
        }[];
    }>;
    getUserStats(userId: string): Promise<{
        fileCount: number;
        storageUsedBytes: bigint;
        storageQuotaBytes: bigint;
        usagePercent: number;
    }>;
    getGrowthStats(days?: number): Promise<{
        id: string;
        createdAt: Date;
        totalFiles: bigint;
        date: Date;
        totalBytes: bigint;
        uploadsCount: bigint;
        downloadsCount: bigint;
        deletionsCount: bigint;
        uploadBytes: bigint;
        downloadBytes: bigint;
        newUsersCount: number;
        apiCallsCount: bigint;
    }[]>;
}
