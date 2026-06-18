import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { buildPaginatedResult, paginate } from '../../common/utils/pagination.util';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(
    userId: string,
    userRole: UserRole,
    query: {
      q: string; page?: number; limit?: number; type?: 'files' | 'folders' | 'all';
      extension?: string; mimeType?: string; dateFrom?: string; dateTo?: string;
      sizeMin?: number; sizeMax?: number; sortBy?: string; sortOrder?: 'asc' | 'desc';
    },
  ) {
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);
    const { skip, take } = paginate(query);
    const q = query.q?.trim();
    if (!q) return { files: [], folders: [], total: 0 };

    const ownerFilter = isAdmin ? {} : { userId };
    const dateFilter: any = {};
    if (query.dateFrom) dateFilter.gte = new Date(query.dateFrom);
    if (query.dateTo) dateFilter.lte = new Date(query.dateTo);

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
}
