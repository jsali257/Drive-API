import { Injectable } from '@nestjs/common';
import * as os from 'os';
import * as fs from 'fs';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SystemService {
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  async getHealth() {
    const dbOk = await this.checkDatabase();
    const diskInfo = await this.getDiskInfo();

    return {
      status: dbOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      node: process.version,
      platform: process.platform,
      services: {
        database: dbOk ? 'up' : 'down',
        storage: diskInfo.accessible ? 'up' : 'down',
      },
      system: {
        cpuCount: os.cpus().length,
        totalMemoryMb: Math.round(os.totalmem() / 1024 / 1024),
        freeMemoryMb: Math.round(os.freemem() / 1024 / 1024),
        loadAvg: os.loadavg(),
      },
      disk: diskInfo,
    };
  }

  async getSettings() {
    return this.prisma.setting.findMany({ orderBy: [{ group: 'asc' }, { key: 'asc' }] });
  }

  async getPublicSettings() {
    return this.prisma.setting.findMany({ where: { isPublic: true }, orderBy: { key: 'asc' } });
  }

  async updateSetting(key: string, value: string) {
    return this.prisma.setting.update({ where: { key }, data: { value } });
  }

  async updateSettings(settings: { key: string; value: string }[]) {
    const results = await Promise.all(
      settings.map(({ key, value }) =>
        this.prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } }),
      ),
    );
    return results;
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async getDiskInfo() {
    const storageRoot = this.config.get<string>('storage.root', 'D:\\Storage');
    try {
      await fs.promises.access(storageRoot);
      const stat = await fs.promises.statfs(storageRoot).catch(() => null);
      return {
        accessible: true,
        path: storageRoot,
        ...(stat && {
          totalBytes: stat.bsize * stat.blocks,
          freeBytes: stat.bsize * stat.bavail,
          usedBytes: stat.bsize * (stat.blocks - stat.bavail),
        }),
      };
    } catch {
      return { accessible: false, path: storageRoot };
    }
  }
}
