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

  async access(token: string, password?: string, ip?: string) {
    const share = await this.prisma.share.findUnique({
      where: { token },
      include: { file: true, folder: { include: { files: true } } },
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
      data: { action: AuditAction.SHARE_ACCESSED, resourceId: share.id, ipAddress: ip },
    });

    const { passwordHash, ...safeShare } = share;
    return safeShare;
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

  async viewFile(token: string, password?: string, ip?: string) {
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

    return { path: filePath, file: share.file };
  }

  async downloadFile(token: string, password?: string, ip?: string) {
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
      data: { action: AuditAction.FILE_DOWNLOADED, resourceId: share.fileId, ipAddress: ip },
    });

    return { path: filePath, file: share.file };
  }
}
