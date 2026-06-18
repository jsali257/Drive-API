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
exports.SharesService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcrypt");
const fs = require("fs");
const nanoid_1 = require("nanoid");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const pagination_util_1 = require("../../common/utils/pagination.util");
const storage_engine_service_1 = require("../files/storage-engine.service");
let SharesService = class SharesService {
    constructor(prisma, storageEngine) {
        this.prisma = prisma;
        this.storageEngine = storageEngine;
    }
    async create(userId, data) {
        if (!data.fileId && !data.folderId)
            throw new common_1.BadRequestException('Must specify fileId or folderId');
        let passwordHash;
        if (data.password) {
            passwordHash = await bcrypt.hash(data.password, 10);
        }
        const token = (0, nanoid_1.nanoid)(32);
        const share = await this.prisma.share.create({
            data: {
                token,
                userId,
                fileId: data.fileId,
                folderId: data.folderId,
                type: data.password ? client_1.ShareType.PASSWORD_PROTECTED : (data.type || client_1.ShareType.PUBLIC),
                access: data.access || client_1.ShareAccess.DOWNLOAD,
                passwordHash,
                expiresAt: data.expiresAt,
                maxDownloads: data.maxDownloads,
                allowDownload: data.allowDownload ?? true,
                label: data.label,
            },
        });
        await this.prisma.auditLog.create({ data: { userId, action: client_1.AuditAction.SHARE_CREATED, resourceId: share.id } });
        return { ...share, shareUrl: `/api/shares/${token}/access` };
    }
    async findAll(userId, query) {
        const { skip, take } = (0, pagination_util_1.paginate)(query);
        const [data, total] = await Promise.all([
            this.prisma.share.findMany({ where: { userId }, skip, take, orderBy: { createdAt: 'desc' }, include: { file: { select: { originalName: true, mimeType: true, size: true } }, folder: { select: { name: true } } } }),
            this.prisma.share.count({ where: { userId } }),
        ]);
        return (0, pagination_util_1.buildPaginatedResult)(data, total, query);
    }
    async access(token, password, ip) {
        const share = await this.prisma.share.findUnique({
            where: { token },
            include: { file: true, folder: { include: { files: true } } },
        });
        if (!share || !share.isActive)
            throw new common_1.NotFoundException('Share link not found or disabled');
        if (share.expiresAt && share.expiresAt < new Date())
            throw new common_1.ForbiddenException('Share link has expired');
        if (share.maxDownloads && share.downloadCount >= share.maxDownloads)
            throw new common_1.ForbiddenException('Download limit reached');
        if (share.type === 'PASSWORD_PROTECTED') {
            if (!password)
                throw new common_1.ForbiddenException('Password required');
            const valid = await bcrypt.compare(password, share.passwordHash ?? '');
            if (!valid)
                throw new common_1.ForbiddenException('Incorrect password');
        }
        await this.prisma.share.update({
            where: { id: share.id },
            data: { downloadCount: { increment: 1 }, lastAccessedAt: new Date(), lastAccessedIp: ip },
        });
        await this.prisma.auditLog.create({
            data: { action: client_1.AuditAction.SHARE_ACCESSED, resourceId: share.id, ipAddress: ip },
        });
        const { passwordHash, ...safeShare } = share;
        return safeShare;
    }
    async revoke(id, userId) {
        const share = await this.prisma.share.findFirst({ where: { id, userId } });
        if (!share)
            throw new common_1.NotFoundException('Share not found');
        return this.prisma.share.update({ where: { id }, data: { isActive: false } });
    }
    async delete(id, userId) {
        const share = await this.prisma.share.findFirst({ where: { id, userId } });
        if (!share)
            throw new common_1.NotFoundException('Share not found');
        await this.prisma.share.delete({ where: { id } });
        await this.prisma.auditLog.create({ data: { userId, action: client_1.AuditAction.SHARE_DELETED, resourceId: id } });
        return { message: 'Share deleted' };
    }
    async viewFile(token, password, ip) {
        const share = await this.prisma.share.findUnique({
            where: { token },
            include: { file: true },
        });
        if (!share || !share.isActive)
            throw new common_1.NotFoundException('Share link not found or disabled');
        if (!share.fileId || !share.file)
            throw new common_1.BadRequestException('This share is for a folder, not a file');
        if (share.expiresAt && share.expiresAt < new Date())
            throw new common_1.ForbiddenException('Share link has expired');
        if (share.maxDownloads && share.downloadCount >= share.maxDownloads)
            throw new common_1.ForbiddenException('Download limit reached');
        if (share.type === 'PASSWORD_PROTECTED') {
            if (!password)
                throw new common_1.ForbiddenException('Password required');
            const valid = await bcrypt.compare(password, share.passwordHash ?? '');
            if (!valid)
                throw new common_1.ForbiddenException('Incorrect password');
        }
        const filePath = this.storageEngine.resolvePath(share.file.storagePath);
        if (!fs.existsSync(filePath))
            throw new common_1.NotFoundException('File not found on disk');
        return { path: filePath, file: share.file };
    }
    async downloadFile(token, password, ip) {
        const share = await this.prisma.share.findUnique({
            where: { token },
            include: { file: true },
        });
        if (!share || !share.isActive)
            throw new common_1.NotFoundException('Share link not found or disabled');
        if (!share.fileId || !share.file)
            throw new common_1.BadRequestException('This share link is for a folder, not a file');
        if (share.expiresAt && share.expiresAt < new Date())
            throw new common_1.ForbiddenException('Share link has expired');
        if (share.maxDownloads && share.downloadCount >= share.maxDownloads)
            throw new common_1.ForbiddenException('Download limit reached');
        if (share.allowDownload === false)
            throw new common_1.ForbiddenException('Download is disabled for this share');
        if (share.type === 'PASSWORD_PROTECTED') {
            if (!password)
                throw new common_1.ForbiddenException('Password required');
            const valid = await bcrypt.compare(password, share.passwordHash ?? '');
            if (!valid)
                throw new common_1.ForbiddenException('Incorrect password');
        }
        const filePath = this.storageEngine.resolvePath(share.file.storagePath);
        if (!fs.existsSync(filePath))
            throw new common_1.NotFoundException('File not found on disk');
        await this.prisma.share.update({
            where: { id: share.id },
            data: { downloadCount: { increment: 1 }, lastAccessedAt: new Date(), lastAccessedIp: ip },
        });
        await this.prisma.auditLog.create({
            data: { action: client_1.AuditAction.FILE_DOWNLOADED, resourceId: share.fileId, ipAddress: ip },
        });
        return { path: filePath, file: share.file };
    }
};
exports.SharesService = SharesService;
exports.SharesService = SharesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        storage_engine_service_1.StorageEngineService])
], SharesService);
//# sourceMappingURL=shares.service.js.map