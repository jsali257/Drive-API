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
var FilesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const uuid_1 = require("uuid");
const mime = require("mime-types");
const prisma_service_1 = require("../../prisma/prisma.service");
const storage_engine_service_1 = require("./storage-engine.service");
const thumbnail_service_1 = require("./thumbnail.service");
const pagination_util_1 = require("../../common/utils/pagination.util");
const file_filter_util_1 = require("../../common/utils/file-filter.util");
const client_1 = require("@prisma/client");
let FilesService = FilesService_1 = class FilesService {
    constructor(prisma, config, storageEngine, thumbnailService) {
        this.prisma = prisma;
        this.config = config;
        this.storageEngine = storageEngine;
        this.thumbnailService = thumbnailService;
        this.logger = new common_1.Logger(FilesService_1.name);
    }
    async upload(file, userId, opts) {
        (0, file_filter_util_1.validateFileExtension)(file.originalname);
        const sha256 = await this.computeHash(file.path);
        const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
        const mimeType = file.mimetype || mime.lookup(file.originalname) || 'application/octet-stream';
        const destDir = this.storageEngine.getUserUploadDir(userId);
        const storedName = `${(0, uuid_1.v4)()}.${ext || 'bin'}`;
        const storagePath = path.join(destDir, storedName);
        await fs.promises.rename(file.path, storagePath);
        let thumbnailPath = null;
        let previewPath = null;
        if (this.thumbnailService.isImage(mimeType)) {
            thumbnailPath = await this.thumbnailService.generateThumbnail(storagePath, storedName);
            previewPath = await this.thumbnailService.generatePreview(storagePath, storedName);
        }
        const dbFile = await this.prisma.file.create({
            data: {
                originalName: file.originalname,
                storedName,
                displayName: file.originalname,
                extension: ext,
                mimeType,
                size: BigInt(file.size),
                sha256Hash: sha256,
                userId,
                createdById: userId,
                folderId: opts.folderId || null,
                storagePath,
                hasThumbnail: !!thumbnailPath,
                thumbnailPath,
                hasPreview: !!previewPath,
                previewPath,
                description: opts.description,
                tags: opts.tags || [],
            },
        });
        await this.prisma.user.update({
            where: { id: userId },
            data: { storageUsedBytes: { increment: BigInt(file.size) } },
        });
        await this.logActivity(userId, 'FILE_UPLOADED', dbFile.id);
        await this.logAudit(userId, client_1.AuditAction.FILE_UPLOADED, dbFile.id);
        return dbFile;
    }
    async findAll(userId, userRole, query) {
        const { skip, take } = (0, pagination_util_1.paginate)(query);
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        const where = { status: { not: 'DELETED' } };
        if (!isAdmin)
            where.userId = userId;
        if (query.isTrashed !== undefined)
            where.isTrashed = query.isTrashed;
        else
            where.isTrashed = false;
        if (query.folderId !== undefined)
            where.folderId = query.folderId || null;
        if (query.search)
            where.OR = [
                { originalName: { contains: query.search, mode: 'insensitive' } },
                { displayName: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
            ];
        if (query.mimeType)
            where.mimeType = { startsWith: query.mimeType };
        if (query.extension)
            where.extension = query.extension.toLowerCase();
        const orderBy = {};
        if (query.sortBy)
            orderBy[query.sortBy] = query.sortOrder || 'desc';
        else
            orderBy.createdAt = 'desc';
        const [data, total] = await Promise.all([
            this.prisma.file.findMany({ where, skip, take, orderBy }),
            this.prisma.file.count({ where }),
        ]);
        return (0, pagination_util_1.buildPaginatedResult)(data, total, query);
    }
    async findOne(id, userId, userRole) {
        const file = await this.prisma.file.findFirst({ where: { id, status: { not: 'DELETED' } } });
        if (!file)
            throw new common_1.NotFoundException('File not found');
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        if (!isAdmin && file.userId !== userId)
            throw new common_1.ForbiddenException('Access denied');
        return file;
    }
    async downloadStream(id, userId, userRole) {
        const file = await this.findOne(id, userId, userRole);
        const safePath = this.storageEngine.resolvePath(file.storagePath);
        if (!fs.existsSync(safePath))
            throw new common_1.NotFoundException('File not found on disk');
        await this.prisma.file.update({ where: { id }, data: { downloadCount: { increment: 1n } } });
        await this.logActivity(userId, 'FILE_DOWNLOADED', id);
        await this.logAudit(userId, client_1.AuditAction.FILE_DOWNLOADED, id);
        return { path: safePath, file };
    }
    async update(id, userId, userRole, data) {
        const file = await this.findOne(id, userId, userRole);
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        if (!isAdmin && file.userId !== userId)
            throw new common_1.ForbiddenException();
        const updated = await this.prisma.file.update({ where: { id }, data });
        if (data.displayName)
            await this.logAudit(userId, client_1.AuditAction.FILE_RENAMED, id);
        return updated;
    }
    async trash(id, userId, userRole) {
        const file = await this.findOne(id, userId, userRole);
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        if (!isAdmin && file.userId !== userId)
            throw new common_1.ForbiddenException();
        await this.prisma.file.update({ where: { id }, data: { isTrashed: true, trashedAt: new Date(), status: 'TRASHED' } });
        await this.logAudit(userId, client_1.AuditAction.FILE_DELETED, id);
        return { message: 'File moved to trash' };
    }
    async restore(id, userId, userRole) {
        const file = await this.findOne(id, userId, userRole);
        const updated = await this.prisma.file.update({
            where: { id },
            data: { isTrashed: false, trashedAt: null, status: 'ACTIVE' },
        });
        await this.logAudit(userId, client_1.AuditAction.FILE_RESTORED, id);
        return updated;
    }
    async permanentDelete(id, userId, userRole) {
        const file = await this.findOne(id, userId, userRole);
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        if (!isAdmin && file.userId !== userId)
            throw new common_1.ForbiddenException();
        await this.storageEngine.deleteFile(file.storagePath);
        if (file.thumbnailPath)
            await this.storageEngine.deleteFile(file.thumbnailPath);
        if (file.previewPath)
            await this.storageEngine.deleteFile(file.previewPath);
        await this.prisma.file.update({ where: { id }, data: { status: 'DELETED', deletedAt: new Date() } });
        await this.prisma.user.update({
            where: { id: file.userId },
            data: { storageUsedBytes: { decrement: file.size } },
        });
        return { message: 'File permanently deleted' };
    }
    async bulkTrash(ids, userId, userRole) {
        for (const id of ids)
            await this.trash(id, userId, userRole);
        return { message: `${ids.length} files moved to trash` };
    }
    async initChunkedUpload(userId, data) {
        const upload = await this.prisma.chunkedUpload.create({
            data: {
                userId,
                filename: data.filename,
                mimeType: data.mimeType,
                totalSize: BigInt(data.totalSize),
                totalChunks: data.totalChunks,
                chunkSize: data.chunkSize,
                folderId: data.folderId,
                tempPath: this.storageEngine.getTempChunkDir((0, uuid_1.v4)()),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });
        return upload;
    }
    async uploadChunk(uploadId, chunkIndex, chunkFile, userId) {
        const upload = await this.prisma.chunkedUpload.findFirst({ where: { id: uploadId, userId, isComplete: false } });
        if (!upload)
            throw new common_1.NotFoundException('Chunked upload session not found');
        const chunkPath = path.join(upload.tempPath, `chunk_${chunkIndex}`);
        await fs.promises.copyFile(chunkFile.path, chunkPath);
        await fs.promises.unlink(chunkFile.path);
        await this.prisma.chunkedUpload.update({
            where: { id: uploadId },
            data: { uploadedChunks: { increment: 1 } },
        });
        return { uploadId, chunkIndex, uploaded: upload.uploadedChunks + 1, total: upload.totalChunks };
    }
    async completeChunkedUpload(uploadId, userId) {
        const upload = await this.prisma.chunkedUpload.findFirst({
            where: { id: uploadId, userId, isComplete: false },
        });
        if (!upload)
            throw new common_1.NotFoundException('Upload session not found');
        if (upload.uploadedChunks < upload.totalChunks) {
            throw new common_1.BadRequestException(`Missing chunks: ${upload.uploadedChunks}/${upload.totalChunks}`);
        }
        (0, file_filter_util_1.validateFileExtension)(upload.filename);
        const ext = path.extname(upload.filename).toLowerCase().replace('.', '');
        const destDir = this.storageEngine.getUserUploadDir(userId);
        const storedName = `${(0, uuid_1.v4)()}.${ext || 'bin'}`;
        const finalPath = path.join(destDir, storedName);
        const writeStream = fs.createWriteStream(finalPath);
        for (let i = 0; i < upload.totalChunks; i++) {
            const chunkPath = path.join(upload.tempPath, `chunk_${i}`);
            const chunkData = await fs.promises.readFile(chunkPath);
            await new Promise((res, rej) => writeStream.write(chunkData, (e) => (e ? rej(e) : res())));
            await fs.promises.unlink(chunkPath);
        }
        await new Promise((res) => writeStream.end(res));
        await fs.promises.rmdir(upload.tempPath).catch(() => { });
        const sha256 = await this.computeHash(finalPath);
        const stat = await fs.promises.stat(finalPath);
        let thumbnailPath = null;
        let previewPath = null;
        if (this.thumbnailService.isImage(upload.mimeType)) {
            thumbnailPath = await this.thumbnailService.generateThumbnail(finalPath, storedName);
            previewPath = await this.thumbnailService.generatePreview(finalPath, storedName);
        }
        const dbFile = await this.prisma.file.create({
            data: {
                originalName: upload.filename,
                storedName,
                displayName: upload.filename,
                extension: ext,
                mimeType: upload.mimeType,
                size: BigInt(stat.size),
                sha256Hash: sha256,
                userId,
                createdById: userId,
                folderId: upload.folderId,
                storagePath: finalPath,
                hasThumbnail: !!thumbnailPath,
                thumbnailPath,
                hasPreview: !!previewPath,
                previewPath,
            },
        });
        await this.prisma.chunkedUpload.update({ where: { id: uploadId }, data: { isComplete: true } });
        await this.prisma.user.update({
            where: { id: userId },
            data: { storageUsedBytes: { increment: BigInt(stat.size) } },
        });
        return dbFile;
    }
    async computeHash(filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);
            stream.on('data', (d) => hash.update(d));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }
    async logActivity(userId, action, resourceId) {
        await this.prisma.activityLog.create({ data: { userId, action, resourceId } });
    }
    async logAudit(userId, action, resourceId) {
        await this.prisma.auditLog.create({ data: { userId, action, resource: 'file', resourceId } });
    }
};
exports.FilesService = FilesService;
exports.FilesService = FilesService = FilesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        storage_engine_service_1.StorageEngineService,
        thumbnail_service_1.ThumbnailService])
], FilesService);
//# sourceMappingURL=files.service.js.map