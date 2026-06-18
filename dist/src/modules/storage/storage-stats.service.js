"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageStatsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let StorageStatsService = class StorageStatsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardStats() {
        const [totalFiles, totalUsers, activeApiKeys, storageStats, recentUploads, recentDownloads, topFiles, largestFiles,] = await Promise.all([
            this.prisma.file.count({ where: { isTrashed: false, status: 'ACTIVE' } }),
            this.prisma.user.count({ where: { deletedAt: null } }),
            this.prisma.apiKey.count({ where: { status: 'ACTIVE' } }),
            this.prisma.file.aggregate({
                _sum: { size: true },
                where: { isTrashed: false, status: 'ACTIVE' },
            }),
            this.prisma.activityLog.count({
                where: { action: 'FILE_UPLOADED', createdAt: { gte: startOfDay() } },
            }),
            this.prisma.activityLog.count({
                where: { action: 'FILE_DOWNLOADED', createdAt: { gte: startOfDay() } },
            }),
            this.prisma.file.findMany({
                where: { isTrashed: false, status: 'ACTIVE' },
                orderBy: { downloadCount: 'desc' },
                take: 10,
                select: { id: true, originalName: true, mimeType: true, size: true, downloadCount: true },
            }),
            this.prisma.file.findMany({
                where: { isTrashed: false, status: 'ACTIVE' },
                orderBy: { size: 'desc' },
                take: 10,
                select: { id: true, originalName: true, mimeType: true, size: true },
            }),
        ]);
        return {
            totalFiles,
            totalUsers,
            activeApiKeys,
            storageUsedBytes: storageStats._sum.size || 0n,
            uploadsToday: recentUploads,
            downloadsToday: recentDownloads,
            topDownloadedFiles: topFiles,
            largestFiles,
        };
    }
    async getUserStats(userId) {
        const [fileCount, storageAgg, user] = await Promise.all([
            this.prisma.file.count({ where: { userId, isTrashed: false, status: 'ACTIVE' } }),
            this.prisma.file.aggregate({ _sum: { size: true }, where: { userId, status: 'ACTIVE' } }),
            this.prisma.user.findUnique({ where: { id: userId }, select: { storageQuotaBytes: true, storageUsedBytes: true } }),
        ]);
        return {
            fileCount,
            storageUsedBytes: storageAgg._sum.size || 0n,
            storageQuotaBytes: user?.storageQuotaBytes || 0n,
            usagePercent: user?.storageQuotaBytes
                ? Number(((user.storageUsedBytes * 100n) / user.storageQuotaBytes).toString())
                : 0,
        };
    }
    async getGrowthStats(days = 30) {
        try {
            return await this.prisma.storageStat.findMany({ orderBy: { date: 'asc' }, take: days });
        }
        catch {
            return [];
        }
    }
};
exports.StorageStatsService = StorageStatsService;
exports.StorageStatsService = StorageStatsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StorageStatsService);
function startOfDay() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}
//# sourceMappingURL=storage-stats.service.js.map