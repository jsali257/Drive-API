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
exports.LogsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const pagination_util_1 = require("../../common/utils/pagination.util");
let LogsService = class LogsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAuditLogs(userId, userRole, query) {
        const { skip, take } = (0, pagination_util_1.paginate)(query);
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        const where = {};
        if (!isAdmin)
            where.userId = userId;
        else if (query.userId)
            where.userId = query.userId;
        if (query.action)
            where.action = query.action;
        if (query.dateFrom || query.dateTo) {
            where.createdAt = {};
            if (query.dateFrom)
                where.createdAt.gte = new Date(query.dateFrom);
            if (query.dateTo)
                where.createdAt.lte = new Date(query.dateTo);
        }
        const [data, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { email: true, username: true } } },
            }),
            this.prisma.auditLog.count({ where }),
        ]);
        return (0, pagination_util_1.buildPaginatedResult)(data, total, query);
    }
    async getActivityLogs(userId, userRole, query) {
        const { skip, take } = (0, pagination_util_1.paginate)(query);
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        const where = {};
        if (!isAdmin)
            where.userId = userId;
        else if (query.userId)
            where.userId = query.userId;
        if (query.action)
            where.action = query.action;
        const [data, total] = await Promise.all([
            this.prisma.activityLog.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { email: true, username: true } } },
            }),
            this.prisma.activityLog.count({ where }),
        ]);
        return (0, pagination_util_1.buildPaginatedResult)(data, total, query);
    }
};
exports.LogsService = LogsService;
exports.LogsService = LogsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LogsService);
//# sourceMappingURL=logs.service.js.map