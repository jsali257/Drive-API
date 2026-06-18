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
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const pagination_util_1 = require("../../common/utils/pagination.util");
let SearchService = class SearchService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async search(userId, userRole, query) {
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
        const { skip, take } = (0, pagination_util_1.paginate)(query);
        const q = query.q?.trim();
        if (!q)
            return { files: [], folders: [], total: 0 };
        const ownerFilter = isAdmin ? {} : { userId };
        const dateFilter = {};
        if (query.dateFrom)
            dateFilter.gte = new Date(query.dateFrom);
        if (query.dateTo)
            dateFilter.lte = new Date(query.dateTo);
        const [files, folders] = await Promise.all([
            query.type !== 'folders'
                ? this.prisma.file.findMany({
                    where: {
                        ...ownerFilter,
                        isTrashed: false,
                        status: 'ACTIVE',
                        OR: [
                            { originalName: { contains: q, mode: 'insensitive' } },
                            { displayName: { contains: q, mode: 'insensitive' } },
                            { description: { contains: q, mode: 'insensitive' } },
                            { tags: { has: q } },
                        ],
                        ...(query.extension && { extension: query.extension }),
                        ...(query.mimeType && { mimeType: { startsWith: query.mimeType } }),
                        ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
                        ...(query.sizeMin && { size: { gte: BigInt(query.sizeMin) } }),
                        ...(query.sizeMax && { size: { lte: BigInt(query.sizeMax) } }),
                    },
                    skip,
                    take,
                    orderBy: query.sortBy ? { [query.sortBy]: query.sortOrder || 'desc' } : { createdAt: 'desc' },
                })
                : Promise.resolve([]),
            query.type !== 'files'
                ? this.prisma.folder.findMany({
                    where: {
                        ...ownerFilter,
                        isTrashed: false,
                        name: { contains: q, mode: 'insensitive' },
                    },
                    take: 20,
                })
                : Promise.resolve([]),
        ]);
        return {
            query: q,
            files,
            folders,
            total: files.length + folders.length,
        };
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SearchService);
//# sourceMappingURL=search.service.js.map