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
exports.SystemService = void 0;
const common_1 = require("@nestjs/common");
const os = require("os");
const fs = require("fs");
const prisma_service_1 = require("../../prisma/prisma.service");
const config_1 = require("@nestjs/config");
let SystemService = class SystemService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
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
    async updateSetting(key, value) {
        return this.prisma.setting.update({ where: { key }, data: { value } });
    }
    async updateSettings(settings) {
        const results = await Promise.all(settings.map(({ key, value }) => this.prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })));
        return results;
    }
    async checkDatabase() {
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            return true;
        }
        catch {
            return false;
        }
    }
    async getDiskInfo() {
        const storageRoot = this.config.get('storage.root', 'D:\\Storage');
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
        }
        catch {
            return { accessible: false, path: storageRoot };
        }
    }
};
exports.SystemService = SystemService;
exports.SystemService = SystemService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, config_1.ConfigService])
], SystemService);
//# sourceMappingURL=system.service.js.map