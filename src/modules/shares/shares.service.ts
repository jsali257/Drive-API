import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { nanoid } from 'nanoid';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction, ShareAccess, ShareType } from '@prisma/client';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination.util';
import { StorageEngineService } from '../files/storage-engine.service';

@Injectable()
export class SharesService {
  constructor(
    private prisma: PrismaService,
    private storageEngine: StorageEngineService,
  ) {}

  async create(
    userId: string,
    data: {
      fileId?: string; folderId?: string; type?: ShareType; access?: ShareAccess;
      password?: string; expiresAt?: Date; maxDownloads?: number; allowDownload?: boolean; label?: string;
    },
  ) {
    if (!data.fileId && !data.folderId) throw new BadRequestException('Must specify fileId or folderId');

    let passwordHash: string | undefined;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 10);
    }

    const token = nanoid(32);
    const share = await this.prisma.share.create({
      data: {
        token,
        userId,
        fileId: data.fileId,
        folderId: data.folderId,
        type: data.password ? ShareType.PASSWORD_PROTECTED : (data.type || ShareType.PUBLIC),
        access: data.access || ShareAccess.DOWNLOAD,
        passwordHash,
        expiresAt: data.expiresAt,
        maxDownloads: data.maxDownloads,
        allowDownload: data.allowDownload ?? true,
        label: data.label,
      },
    });

    await this.prisma.auditLog.create({ data: { userId, action: AuditAction.SHARE_CREATED, resourceId: share.id } });
    return { ...share, shareUrl: `/api/shares/${token}/access` };
  }

  async findAll(userId: string, query: { page?: number; limit?: number }) {
    const { skip, take } = paginate(query);
    const [data, total] = await Promise.all([
      this.prisma.share.findMany({ where: { userId }, skip, take, orderBy: { createdAt: 'desc' }, include: { file: { select: { originalName: true, mimeType: true, size: true } }, folder: { select: { name: true } } } }),
      this.prisma.share.count({ where: { userId } }),
    ]);
    return buildPaginatedResult(data, total, query);
  }

  async getAccessHistory(shareId: string, userId: string, query: { page?: number; limit?: number }) {
    const share = await this.prisma.share.findFirst({ where: { id: shareId, userId } });
    if (!share) throw new NotFoundException('Share not found');

    const { skip, take } = paginate(query);
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { action: 'SHARE_ACCESSED', resourceId: shareId },
        skip, take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where: { action: 'SHARE_ACCESSED', resourceId: shareId } }),
    ]);

    return buildPaginatedResult(data, total, query);
  }

  async access(token: string, password?: string, ip?: string, referer?: string, userAgent?: string, source?: string) {
    const share = await this.prisma.share.findUnique({
      where: { token },
      include: {
        file: true,
        folder: {
          include: {
            files: { where: { isTrashed: false }, orderBy: { originalName: 'asc' } },
            children: { where: { isTrashed: false }, orderBy: { name: 'asc' }, include: { _count: { select: { files: true } } } },
          },
        },
      },
    });

    if (!share || !share.isActive) throw new NotFoundException('Share link not found or disabled');
    if (share.expiresAt && share.expiresAt < new Date()) throw new ForbiddenException('Share link has expired');
    if (share.maxDownloads && share.downloadCount >= share.maxDownloads) throw new ForbiddenException('Download limit reached');

    if (share.type === 'PASSWORD_PROTECTED') {
      if (!password) throw new ForbiddenException('Password required');
      const valid = await bcrypt.compare(password, share.passwordHash ?? '');
      if (!valid) throw new ForbiddenException('Incorrect password');
    }

    await this.prisma.share.update({
      where: { id: share.id },
      data: { downloadCount: { increment: 1 }, lastAccessedAt: new Date(), lastAccessedIp: ip },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.SHARE_ACCESSED,
        resourceId: share.id,
        ipAddress: ip,
        userAgent,
        details: { referer: referer || null, source: source || null },
      },
    });

    const { passwordHash, ...safeShare } = share;
    return safeShare;
  }

  async updatePassword(id: string, userId: string, password: string | null) {
    const share = await this.prisma.share.findFirst({ where: { id, userId } });
    if (!share) throw new NotFoundException('Share not found');

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      return this.prisma.share.update({
        where: { id },
        data: { passwordHash, type: 'PASSWORD_PROTECTED' },
      });
    } else {
      return this.prisma.share.update({
        where: { id },
        data: { passwordHash: null, type: 'PUBLIC' },
      });
    }
  }

  async revoke(id: string, userId: string) {
    const share = await this.prisma.share.findFirst({ where: { id, userId } });
    if (!share) throw new NotFoundException('Share not found');
    return this.prisma.share.update({ where: { id }, data: { isActive: false } });
  }

  async delete(id: string, userId: string) {
    const share = await this.prisma.share.findFirst({ where: { id, userId } });
    if (!share) throw new NotFoundException('Share not found');
    await this.prisma.share.delete({ where: { id } });
    await this.prisma.auditLog.create({ data: { userId, action: AuditAction.SHARE_DELETED, resourceId: id } });
    return { message: 'Share deleted' };
  }

  async downloadFolderFile(token: string, fileId: string, password?: string, ip?: string) {
    const share = await this.prisma.share.findUnique({ where: { token } });

    if (!share || !share.isActive) throw new NotFoundException('Share link not found or disabled');
    if (!share.folderId) throw new BadRequestException('This share is not for a folder');
    if (share.expiresAt && share.expiresAt < new Date()) throw new ForbiddenException('Share link has expired');
    if (share.maxDownloads && share.downloadCount >= share.maxDownloads) throw new ForbiddenException('Download limit reached');

    if (share.type === 'PASSWORD_PROTECTED') {
      if (!password) throw new ForbiddenException('Password required');
      const valid = await bcrypt.compare(password, share.passwordHash ?? '');
      if (!valid) throw new ForbiddenException('Incorrect password');
    }

    const file = await this.prisma.file.findFirst({
      where: { id: fileId, folderId: share.folderId, isTrashed: false },
    });
    if (!file) throw new NotFoundException('File not found in this shared folder');

    const filePath = this.storageEngine.resolvePath(file.storagePath);
    if (!fs.existsSync(filePath)) throw new NotFoundException('File not found on disk');

    await this.prisma.share.update({
      where: { id: share.id },
      data: { downloadCount: { increment: 1 }, lastAccessedAt: new Date(), lastAccessedIp: ip },
    });

    await this.prisma.auditLog.create({
      data: { action: AuditAction.FILE_DOWNLOADED, resourceId: file.id, ipAddress: ip },
    });

    return { path: filePath, file };
  }

  async viewFile(token: string, password?: string, ip?: string, referer?: string, userAgent?: string, source?: string) {
    const share = await this.prisma.share.findUnique({
      where: { token },
      include: { file: true },
    });

    if (!share || !share.isActive) throw new NotFoundException('Share link not found or disabled');
    if (!share.fileId || !share.file) throw new BadRequestException('This share is for a folder, not a file');
    if (share.expiresAt && share.expiresAt < new Date()) throw new ForbiddenException('Share link has expired');
    if (share.maxDownloads && share.downloadCount >= share.maxDownloads) throw new ForbiddenException('Download limit reached');

    if (share.type === 'PASSWORD_PROTECTED') {
      if (!password) throw new ForbiddenException('Password required');
      const valid = await bcrypt.compare(password, share.passwordHash ?? '');
      if (!valid) throw new ForbiddenException('Incorrect password');
    }

    const filePath = this.storageEngine.resolvePath(share.file.storagePath);
    if (!fs.existsSync(filePath)) throw new NotFoundException('File not found on disk');

    await this.prisma.share.update({
      where: { id: share.id },
      data: { downloadCount: { increment: 1 }, lastAccessedAt: new Date(), lastAccessedIp: ip },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.SHARE_ACCESSED,
        resourceId: share.id,
        ipAddress: ip,
        userAgent,
        details: { referer: referer || null, source: source || null, fileName: share.file.originalName },
      },
    });

    return { path: filePath, file: share.file };
  }

  async downloadFile(token: string, password?: string, ip?: string, referer?: string, userAgent?: string, source?: string) {
    const share = await this.prisma.share.findUnique({
      where: { token },
      include: { file: true },
    });

    if (!share || !share.isActive) throw new NotFoundException('Share link not found or disabled');
    if (!share.fileId || !share.file) throw new BadRequestException('This share link is for a folder, not a file');
    if (share.expiresAt && share.expiresAt < new Date()) throw new ForbiddenException('Share link has expired');
    if (share.maxDownloads && share.downloadCount >= share.maxDownloads) throw new ForbiddenException('Download limit reached');
    if (share.allowDownload === false) throw new ForbiddenException('Download is disabled for this share');

    if (share.type === 'PASSWORD_PROTECTED') {
      if (!password) throw new ForbiddenException('Password required');
      const valid = await bcrypt.compare(password, share.passwordHash ?? '');
      if (!valid) throw new ForbiddenException('Incorrect password');
    }

    const filePath = this.storageEngine.resolvePath(share.file.storagePath);
    if (!fs.existsSync(filePath)) throw new NotFoundException('File not found on disk');

    await this.prisma.share.update({
      where: { id: share.id },
      data: { downloadCount: { increment: 1 }, lastAccessedAt: new Date(), lastAccessedIp: ip },
    });

    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.FILE_DOWNLOADED,
        resourceId: share.fileId,
        ipAddress: ip,
        userAgent,
        details: { referer: referer || null, source: source || null, shareId: share.id },
      },
    });

    return { path: filePath, file: share.file };
  }
}
