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
exports.ApiKeysService = void 0;
const common_1 = require("@nestjs/common");
const crypto = require("crypto");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const pagination_util_1 = require("../../common/utils/pagination.util");
let ApiKeysService = class ApiKeysService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, data) {
        const rawKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
        const keyPrefix = rawKey.substring(0, 12);
        const apiKey = await this.prisma.apiKey.create({
            data: {
                userId,
                name: data.name,
                keyHash,
                keyPrefix,
                permissions: data.permissions || [],
                allowedIps: data.allowedIps || [],
                rateLimitPerMin: data.rateLimitPerMin || 60,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
                description: data.description || undefined,
            },
        });
        await this.prisma.auditLog.create({ data: { userId, action: client_1.AuditAction.API_KEY_CREATED, resourceId: apiKey.id } });
        return {
            ...apiKey,
            key: rawKey,
            message: 'Save this key — it will not be shown again',
        };
    }
    async findAll(userId, userRole, query) {
        const { skip, take } = (0, pagination_util_1.paginate)(query);
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        const where = isAdmin ? {} : { userId };
        const [data, total] = await Promise.all([
            this.prisma.apiKey.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { email: true, username: true } } },
            }),
            this.prisma.apiKey.count({ where }),
        ]);
        const sanitized = data.map(({ keyHash, ...k }) => k);
        return (0, pagination_util_1.buildPaginatedResult)(sanitized, total, query);
    }
    async revoke(id, userId, userRole) {
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        const key = await this.prisma.apiKey.findFirst({ where: { id, ...(isAdmin ? {} : { userId }) } });
        if (!key)
            throw new common_1.NotFoundException('API key not found');
        const updated = await this.prisma.apiKey.update({
            where: { id },
            data: { status: 'REVOKED', revokedAt: new Date() },
        });
        await this.prisma.auditLog.create({ data: { userId, action: client_1.AuditAction.API_KEY_REVOKED, resourceId: id } });
        const { keyHash, ...safe } = updated;
        return safe;
    }
    async delete(id, userId, userRole) {
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        const key = await this.prisma.apiKey.findFirst({ where: { id, ...(isAdmin ? {} : { userId }) } });
        if (!key)
            throw new common_1.NotFoundException('API key not found');
        await this.prisma.apiKey.delete({ where: { id } });
        return { message: 'API key deleted' };
    }
    async getUsageStats(id, userId, userRole) {
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        const key = await this.prisma.apiKey.findFirst({ where: { id, ...(isAdmin ? {} : { userId }) } });
        if (!key)
            throw new common_1.NotFoundException('API key not found');
        const logs = await this.prisma.activityLog.findMany({
            where: { apiKeyId: id },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        return { key: { id: key.id, name: key.name, usageCount: key.usageCount, lastUsedAt: key.lastUsedAt }, recentActivity: logs };
    }
};
exports.ApiKeysService = ApiKeysService;
exports.ApiKeysService = ApiKeysService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ApiKeysService);
//# sourceMappingURL=api-keys.service.js.map