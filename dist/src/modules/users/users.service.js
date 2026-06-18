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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const pagination_util_1 = require("../../common/utils/pagination.util");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    get selectFields() {
        return {
            id: true, email: true, username: true, displayName: true, role: true,
            status: true, avatar: true, emailVerified: true, twoFactorEnabled: true,
            lastLoginAt: true, lastLoginIp: true, storageQuotaBytes: true,
            storageUsedBytes: true, timezone: true, language: true, createdAt: true, updatedAt: true,
        };
    }
    async findAll(query) {
        const { skip, take } = (0, pagination_util_1.paginate)(query);
        const where = { deletedAt: null };
        if (query.search) {
            where.OR = [
                { email: { contains: query.search, mode: 'insensitive' } },
                { username: { contains: query.search, mode: 'insensitive' } },
                { displayName: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        if (query.role)
            where.role = query.role;
        const [data, total] = await Promise.all([
            this.prisma.user.findMany({ where, skip, take, select: this.selectFields, orderBy: { createdAt: 'desc' } }),
            this.prisma.user.count({ where }),
        ]);
        return (0, pagination_util_1.buildPaginatedResult)(data, total, query);
    }
    async findOne(id) {
        const user = await this.prisma.user.findFirst({
            where: { id, deletedAt: null },
            select: this.selectFields,
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async update(id, dto, requesterId, requesterRole) {
        const user = await this.findOne(id);
        const roleHierarchy = {
            SUPER_ADMIN: 5, ADMIN: 4, DEVELOPER: 3, USER: 2, READ_ONLY: 1,
        };
        if (dto.role &&
            id !== requesterId &&
            roleHierarchy[requesterRole] <= roleHierarchy[user.role]) {
            throw new common_1.ForbiddenException('Cannot modify user with equal or higher role');
        }
        return this.prisma.user.update({
            where: { id },
            data: dto,
            select: this.selectFields,
        });
    }
    async remove(id, requesterId) {
        if (id === requesterId)
            throw new common_1.ForbiddenException('Cannot delete your own account');
        const user = await this.findOne(id);
        return this.prisma.user.update({
            where: { id },
            data: { deletedAt: new Date(), status: 'INACTIVE' },
            select: this.selectFields,
        });
    }
    async getStorageStats(userId) {
        const [fileCount, storageUsed] = await Promise.all([
            this.prisma.file.count({ where: { userId, isTrashed: false, status: 'ACTIVE' } }),
            this.prisma.user.findUnique({ where: { id: userId }, select: { storageUsedBytes: true, storageQuotaBytes: true } }),
        ]);
        return {
            fileCount,
            storageUsedBytes: storageUsed?.storageUsedBytes ?? 0n,
            storageQuotaBytes: storageUsed?.storageQuotaBytes ?? 0n,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map