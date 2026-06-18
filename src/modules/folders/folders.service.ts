import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction, UserRole } from '@prisma/client';
import slugify from 'slugify';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination.util';

@Injectable()
export class FoldersService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    data: { name: string; parentId?: string; description?: string; colorTag?: string },
  ) {
    const slug = slugify(data.name, { lower: true, strict: true });
    const parentPath = data.parentId ? await this.getPath(data.parentId) : '';
    const path = parentPath ? `${parentPath}/${slug}` : slug;

    const existing = await this.prisma.folder.findFirst({
      where: { userId, parentId: data.parentId || null, slug, isTrashed: false },
    });
    if (existing) throw new ConflictException('A folder with this name already exists here');

    if (data.parentId) {
      const parent = await this.prisma.folder.findFirst({ where: { id: data.parentId, userId } });
      if (!parent) throw new NotFoundException('Parent folder not found');
    }

    const folder = await this.prisma.folder.create({
      data: { name: data.name, slug, userId, parentId: data.parentId || null, path, description: data.description, colorTag: data.colorTag },
    });

    await this.prisma.auditLog.create({ data: { userId, action: AuditAction.FOLDER_CREATED, resourceId: folder.id } });
    return folder;
  }

  async findAll(userId: string, userRole: UserRole, query: { page?: number; limit?: number; parentId?: string; search?: string; isTrashed?: boolean }) {
    const { skip, take } = paginate(query);
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
    const where: any = { isTrashed: query.isTrashed ?? false };

    if (!isAdmin) where.userId = userId;
    if (query.parentId !== undefined) where.parentId = query.parentId || null;
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.folder.findMany({ where, skip, take, orderBy: { name: 'asc' }, include: { _count: { select: { files: true, children: true } } } }),
      this.prisma.folder.count({ where }),
    ]);

    return buildPaginatedResult(data, total, query);
  }

  async findOne(id: string, userId: string, userRole: UserRole) {
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
    const folder = await this.prisma.folder.findFirst({
      where: { id, ...(isAdmin ? {} : { userId }) },
      include: { children: true, _count: { select: { files: true } } },
    });
    if (!folder) throw new NotFoundException('Folder not found');
    return folder;
  }

  async update(id: string, userId: string, userRole: UserRole, data: { name?: string; description?: string; colorTag?: string; isFavorite?: boolean }) {
    const folder = await this.findOne(id, userId, userRole);
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
    if (!isAdmin && folder.userId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.folder.update({
      where: { id },
      data: { ...data, slug: data.name ? slugify(data.name, { lower: true, strict: true }) : undefined },
    });
    if (data.name) await this.prisma.auditLog.create({ data: { userId, action: AuditAction.FOLDER_RENAMED, resourceId: id } });
    return updated;
  }

  async trash(id: string, userId: string, userRole: UserRole) {
    const folder = await this.findOne(id, userId, userRole);
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
    if (!isAdmin && folder.userId !== userId) throw new ForbiddenException();

    await this.trashRecursive(id, userId);
    await this.prisma.auditLog.create({ data: { userId, action: AuditAction.FOLDER_DELETED, resourceId: id } });
    return { message: 'Folder moved to trash' };
  }

  async restore(id: string, userId: string, userRole: UserRole) {
    await this.findOne(id, userId, userRole);
    return this.prisma.folder.update({ where: { id }, data: { isTrashed: false, trashedAt: null } });
  }

  async getTree(userId: string): Promise<any[]> {
    const all = await this.prisma.folder.findMany({
      where: { userId, isTrashed: false },
      orderBy: { name: 'asc' },
    });
    return this.buildTree(all, null);
  }

  private buildTree(folders: any[], parentId: string | null): any[] {
    return folders
      .filter((f) => f.parentId === parentId)
      .map((f) => ({ ...f, children: this.buildTree(folders, f.id) }));
  }

  private async trashRecursive(folderId: string, userId: string) {
    await this.prisma.folder.update({ where: { id: folderId }, data: { isTrashed: true, trashedAt: new Date() } });
    await this.prisma.file.updateMany({ where: { folderId }, data: { isTrashed: true, trashedAt: new Date(), status: 'TRASHED' } });
    const children = await this.prisma.folder.findMany({ where: { parentId: folderId } });
    for (const child of children) await this.trashRecursive(child.id, userId);
  }

  private async getPath(folderId: string): Promise<string> {
    const folder = await this.prisma.folder.findUnique({ where: { id: folderId } });
    return folder?.path || '';
  }
}
