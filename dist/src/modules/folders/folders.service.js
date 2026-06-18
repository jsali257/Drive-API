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
exports.FoldersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const slugify_1 = require("slugify");
const pagination_util_1 = require("../../common/utils/pagination.util");
let FoldersService = class FoldersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, data) {
        const slug = (0, slugify_1.default)(data.name, { lower: true, strict: true });
        const parentPath = data.parentId ? await this.getPath(data.parentId) : '';
        const path = parentPath ? `${parentPath}/${slug}` : slug;
        const existing = await this.prisma.folder.findFirst({
            where: { userId, parentId: data.parentId || null, slug, isTrashed: false },
        });
        if (existing)
            throw new common_1.ConflictException('A folder with this name already exists here');
        if (data.parentId) {
            const parent = await this.prisma.folder.findFirst({ where: { id: data.parentId, userId } });
            if (!parent)
                throw new common_1.NotFoundException('Parent folder not found');
        }
        const folder = await this.prisma.folder.create({
            data: { name: data.name, slug, userId, parentId: data.parentId || null, path, description: data.description, colorTag: data.colorTag },
        });
        await this.prisma.auditLog.create({ data: { userId, action: client_1.AuditAction.FOLDER_CREATED, resourceId: folder.id } });
        return folder;
    }
    async findAll(userId, userRole, query) {
        const { skip, take } = (0, pagination_util_1.paginate)(query);
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        const where = { isTrashed: query.isTrashed ?? false };
        if (!isAdmin)
            where.userId = userId;
        if (query.parentId !== undefined)
            where.parentId = query.parentId || null;
        if (query.search)
            where.name = { contains: query.search, mode: 'insensitive' };
        const [data, total] = await Promise.all([
            this.prisma.folder.findMany({ where, skip, take, orderBy: { name: 'asc' }, include: { _count: { select: { files: true, children: true } } } }),
            this.prisma.folder.count({ where }),
        ]);
        return (0, pagination_util_1.buildPaginatedResult)(data, total, query);
    }
    async findOne(id, userId, userRole) {
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        const folder = await this.prisma.folder.findFirst({
            where: { id, ...(isAdmin ? {} : { userId }) },
            include: { children: true, _count: { select: { files: true } } },
        });
        if (!folder)
            throw new common_1.NotFoundException('Folder not found');
        return folder;
    }
    async update(id, userId, userRole, data) {
        const folder = await this.findOne(id, userId, userRole);
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        if (!isAdmin && folder.userId !== userId)
            throw new common_1.ForbiddenException();
        const updated = await this.prisma.folder.update({
            where: { id },
            data: { ...data, slug: data.name ? (0, slugify_1.default)(data.name, { lower: true, strict: true }) : undefined },
        });
        if (data.name)
            await this.prisma.auditLog.create({ data: { userId, action: client_1.AuditAction.FOLDER_RENAMED, resourceId: id } });
        return updated;
    }
    async trash(id, userId, userRole) {
        const folder = await this.findOne(id, userId, userRole);
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        if (!isAdmin && folder.userId !== userId)
            throw new common_1.ForbiddenException();
        await this.trashRecursive(id, userId);
        await this.prisma.auditLog.create({ data: { userId, action: client_1.AuditAction.FOLDER_DELETED, resourceId: id } });
        return { message: 'Folder moved to trash' };
    }
    async restore(id, userId, userRole) {
        await this.findOne(id, userId, userRole);
        return this.prisma.folder.update({ where: { id }, data: { isTrashed: false, trashedAt: null } });
    }
    async getTree(userId) {
        const all = await this.prisma.folder.findMany({
            where: { userId, isTrashed: false },
            orderBy: { name: 'asc' },
        });
        return this.buildTree(all, null);
    }
    buildTree(folders, parentId) {
        return folders
            .filter((f) => f.parentId === parentId)
            .map((f) => ({ ...f, children: this.buildTree(folders, f.id) }));
    }
    async trashRecursive(folderId, userId) {
        await this.prisma.folder.update({ where: { id: folderId }, data: { isTrashed: true, trashedAt: new Date() } });
        await this.prisma.file.updateMany({ where: { folderId }, data: { isTrashed: true, trashedAt: new Date(), status: 'TRASHED' } });
        const children = await this.prisma.folder.findMany({ where: { parentId: folderId } });
        for (const child of children)
            await this.trashRecursive(child.id, userId);
    }
    async getPath(folderId) {
        const folder = await this.prisma.folder.findUnique({ where: { id: folderId } });
        return folder?.path || '';
    }
};
exports.FoldersService = FoldersService;
exports.FoldersService = FoldersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FoldersService);
//# sourceMappingURL=folders.service.js.map