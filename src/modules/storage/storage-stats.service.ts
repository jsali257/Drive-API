import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageEngineService } from '../files/storage-engine.service';

@Injectable()
export class StorageStatsService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async getDashboardStats() {
    const [
      totalFiles, totalUsers, activeApiKeys,
      storageStats, recentUploads, recentDownloads,
      topFiles, largestFiles,
    ] = await Promise.all([
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

  async getUserStats(userId: string) {
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
    } catch {
      return [];
    }
  }
}

function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
