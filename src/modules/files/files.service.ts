import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import * as mime from 'mime-types';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageEngineService } from './storage-engine.service';
import { ThumbnailService } from './thumbnail.service';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination.util';
import { validateFileExtension } from '../../common/utils/file-filter.util';
import { AuditAction, UserRole } from '@prisma/client';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private storageEngine: StorageEngineService,
    private thumbnailService: ThumbnailService,
  ) {}

  async upload(
    file: Express.Multer.File,
    userId: string,
    opts: { folderId?: string; description?: string; tags?: string[] },
  ) {
    validateFileExtension(file.originalname);
    const sha256 = await this.computeHash(file.path);
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mimeType = file.mimetype || mime.lookup(file.originalname) || 'application/octet-stream';

    const destDir = this.storageEngine.getUserUploadDir(userId);
    const storedName = `${uuidv4()}.${ext || 'bin'}`;
    const storagePath = path.join(destDir, storedName);

    await fs.promises.rename(file.path, storagePath);

    let thumbnailPath: string | null = null;
    let previewPath: string | null = null;

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
    await this.logAudit(userId, AuditAction.FILE_UPLOADED, dbFile.id);

    return dbFile;
  }

  async findAll(
    userId: string,
    userRole: UserRole,
    query: {
      page?: number; limit?: number; folderId?: string; search?: string;
      mimeType?: string; extension?: string; isTrashed?: boolean; sortBy?: string; sortOrder?: 'asc' | 'desc';
    },
  ) {
    const { skip, take } = paginate(query);
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
    const where: any = { status: { not: 'DELETED' } };

    if (!isAdmin) where.userId = userId;
    if (query.isTrashed !== undefined) where.isTrashed = query.isTrashed;
    else where.isTrashed = false;

    if (query.folderId !== undefined) where.folderId = query.folderId || null;
    if (query.search) where.OR = [
      { originalName: { contains: query.search, mode: 'insensitive' } },
      { displayName: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
    if (query.mimeType) where.mimeType = { startsWith: query.mimeType };
    if (query.extension) where.extension = query.extension.toLowerCase();

    const orderBy: any = {};
    if (query.sortBy) orderBy[query.sortBy] = query.sortOrder || 'desc';
    else orderBy.createdAt = 'desc';

    const [data, total] = await Promise.all([
      this.prisma.file.findMany({ where, skip, take, orderBy }),
      this.prisma.file.count({ where }),
    ]);

    return buildPaginatedResult(data, total, query);
  }

  async findOne(id: string, userId: string, userRole: UserRole) {
    const file = await this.prisma.file.findFirst({ where: { id, status: { not: 'DELETED' } } });
    if (!file) throw new NotFoundException('File not found');
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
    if (!isAdmin && file.userId !== userId) throw new ForbiddenException('Access denied');
    return file;
  }

  async downloadStream(id: string, userId: string, userRole: UserRole) {
    const file = await this.findOne(id, userId, userRole);
    const safePath = this.storageEngine.resolvePath(file.storagePath);

    if (!fs.existsSync(safePath)) throw new NotFoundException('File not found on disk');

    await this.prisma.file.update({ where: { id }, data: { downloadCount: { increment: 1n } } });
    await this.logActivity(userId, 'FILE_DOWNLOADED', id);
    await this.logAudit(userId, AuditAction.FILE_DOWNLOADED, id);

    return { path: safePath, file };
  }

  async update(id: string, userId: string, userRole: UserRole, data: { displayName?: string; description?: string; tags?: string[]; folderId?: string; isFavorite?: boolean }) {
    const file = await this.findOne(id, userId, userRole);
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
    if (!isAdmin && file.userId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.file.update({ where: { id }, data });
    if (data.displayName) await this.logAudit(userId, AuditAction.FILE_RENAMED, id);
    return updated;
  }

  async trash(id: string, userId: string, userRole: UserRole) {
    const file = await this.findOne(id, userId, userRole);
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
    if (!isAdmin && file.userId !== userId) throw new ForbiddenException();

    await this.prisma.file.update({ where: { id }, data: { isTrashed: true, trashedAt: new Date(), status: 'TRASHED' } });
    await this.logAudit(userId, AuditAction.FILE_DELETED, id);
    return { message: 'File moved to trash' };
  }

  async restore(id: string, userId: string, userRole: UserRole) {
    const file = await this.findOne(id, userId, userRole);
    const updated = await this.prisma.file.update({
      where: { id },
      data: { isTrashed: false, trashedAt: null, status: 'ACTIVE' },
    });
    await this.logAudit(userId, AuditAction.FILE_RESTORED, id);
    return updated;
  }

  async permanentDelete(id: string, userId: string, userRole: UserRole) {
    const file = await this.findOne(id, userId, userRole);
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
    if (!isAdmin && file.userId !== userId) throw new ForbiddenException();

    await this.storageEngine.deleteFile(file.storagePath);
    if (file.thumbnailPath) await this.storageEngine.deleteFile(file.thumbnailPath);
    if (file.previewPath) await this.storageEngine.deleteFile(file.previewPath);

    await this.prisma.file.update({ where: { id }, data: { status: 'DELETED', deletedAt: new Date() } });
    await this.prisma.user.update({
      where: { id: file.userId },
      data: { storageUsedBytes: { decrement: file.size } },
    });
    return { message: 'File permanently deleted' };
  }

  async bulkTrash(ids: string[], userId: string, userRole: UserRole) {
    for (const id of ids) await this.trash(id, userId, userRole);
    return { message: `${ids.length} files moved to trash` };
  }

  async initChunkedUpload(
    userId: string,
    data: { filename: string; mimeType: string; totalSize: number; totalChunks: number; chunkSize: number; folderId?: string },
  ) {
    const upload = await this.prisma.chunkedUpload.create({
      data: {
        userId,
        filename: data.filename,
        mimeType: data.mimeType,
        totalSize: BigInt(data.totalSize),
        totalChunks: data.totalChunks,
        chunkSize: data.chunkSize,
        folderId: data.folderId,
        tempPath: this.storageEngine.getTempChunkDir(uuidv4()),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return upload;
  }

  async uploadChunk(uploadId: string, chunkIndex: number, chunkFile: Express.Multer.File, userId: string) {
    const upload = await this.prisma.chunkedUpload.findFirst({ where: { id: uploadId, userId, isComplete: false } });
    if (!upload) throw new NotFoundException('Chunked upload session not found');

    const chunkPath = path.join(upload.tempPath, `chunk_${chunkIndex}`);
    await fs.promises.copyFile(chunkFile.path, chunkPath);
    await fs.promises.unlink(chunkFile.path);

    await this.prisma.chunkedUpload.update({
      where: { id: uploadId },
      data: { uploadedChunks: { increment: 1 } },
    });

    return { uploadId, chunkIndex, uploaded: upload.uploadedChunks + 1, total: upload.totalChunks };
  }

  async completeChunkedUpload(uploadId: string, userId: string) {
    const upload = await this.prisma.chunkedUpload.findFirst({
      where: { id: uploadId, userId, isComplete: false },
    });
    if (!upload) throw new NotFoundException('Upload session not found');
    if (upload.uploadedChunks < upload.totalChunks) {
      throw new BadRequestException(`Missing chunks: ${upload.uploadedChunks}/${upload.totalChunks}`);
    }

    validateFileExtension(upload.filename);

    const ext = path.extname(upload.filename).toLowerCase().replace('.', '');
    const destDir = this.storageEngine.getUserUploadDir(userId);
    const storedName = `${uuidv4()}.${ext || 'bin'}`;
    const finalPath = path.join(destDir, storedName);

    const writeStream = fs.createWriteStream(finalPath);
    for (let i = 0; i < upload.totalChunks; i++) {
      const chunkPath = path.join(upload.tempPath, `chunk_${i}`);
      const chunkData = await fs.promises.readFile(chunkPath);
      await new Promise<void>((res, rej) => writeStream.write(chunkData, (e) => (e ? rej(e) : res())));
      await fs.promises.unlink(chunkPath);
    }
    await new Promise<void>((res) => writeStream.end(res));
    await fs.promises.rmdir(upload.tempPath).catch(() => {});

    const sha256 = await this.computeHash(finalPath);
    const stat = await fs.promises.stat(finalPath);

    let thumbnailPath: string | null = null;
    let previewPath: string | null = null;
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

  private async computeHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (d) => hash.update(d));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private async logActivity(userId: string, action: string, resourceId: string) {
    await this.prisma.activityLog.create({ data: { userId, action, resourceId } });
  }

  private async logAudit(userId: string, action: AuditAction, resourceId: string) {
    await this.prisma.auditLog.create({ data: { userId, action, resource: 'file', resourceId } });
  }
}
