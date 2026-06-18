import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';
import { paginate, buildPaginatedResult } from '../../common/utils/pagination.util';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private get selectFields() {
    return {
      id: true, email: true, username: true, displayName: true, role: true,
      status: true, avatar: true, emailVerified: true, twoFactorEnabled: true,
      lastLoginAt: true, lastLoginIp: true, storageQuotaBytes: true,
      storageUsedBytes: true, timezone: true, language: true, createdAt: true, updatedAt: true,
    };
  }

  async findAll(query: { page?: number; limit?: number; search?: string; role?: UserRole }) {
    const { skip, take } = paginate(query);
    const where: any = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { username: { contains: query.search, mode: 'insensitive' } },
        { displayName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.role) where.role = query.role;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take, select: this.selectFields, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where }),
    ]);

    return buildPaginatedResult(data, total, query);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: this.selectFields,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto, requesterId: string, requesterRole: UserRole) {
    const user = await this.findOne(id);

    const roleHierarchy: Record<UserRole, number> = {
      SUPER_ADMIN: 5, ADMIN: 4, DEVELOPER: 3, USER: 2, READ_ONLY: 1,
    };

    if (
      dto.role &&
      id !== requesterId &&
      roleHierarchy[requesterRole] <= roleHierarchy[user.role as UserRole]
    ) {
      throw new ForbiddenException('Cannot modify user with equal or higher role');
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: this.selectFields,
    });
  }

  async remove(id: string, requesterId: string) {
    if (id === requesterId) throw new ForbiddenException('Cannot delete your own account');
    const user = await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
      select: this.selectFields,
    });
  }

  async getStorageStats(userId: string) {
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
}
