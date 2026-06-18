import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
export declare class FoldersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: string, data: {
        name: string;
        parentId?: string;
        description?: string;
        colorTag?: string;
    }): Promise<{
        name: string;
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isTrashed: boolean;
        isFavorite: boolean;
        trashedAt: Date | null;
        path: string;
        slug: string;
        parentId: string | null;
        colorTag: string | null;
        isShared: boolean;
    }>;
    findAll(userId: string, userRole: UserRole, query: {
        page?: number;
        limit?: number;
        parentId?: string;
        search?: string;
        isTrashed?: boolean;
    }): Promise<import("../../common/utils/pagination.util").PaginatedResult<{
        _count: {
            files: number;
            children: number;
        };
    } & {
        name: string;
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isTrashed: boolean;
        isFavorite: boolean;
        trashedAt: Date | null;
        path: string;
        slug: string;
        parentId: string | null;
        colorTag: string | null;
        isShared: boolean;
    }>>;
    findOne(id: string, userId: string, userRole: UserRole): Promise<{
        _count: {
            files: number;
        };
        children: {
            name: string;
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            isTrashed: boolean;
            isFavorite: boolean;
            trashedAt: Date | null;
            path: string;
            slug: string;
            parentId: string | null;
            colorTag: string | null;
            isShared: boolean;
        }[];
    } & {
        name: string;
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isTrashed: boolean;
        isFavorite: boolean;
        trashedAt: Date | null;
        path: string;
        slug: string;
        parentId: string | null;
        colorTag: string | null;
        isShared: boolean;
    }>;
    update(id: string, userId: string, userRole: UserRole, data: {
        name?: string;
        description?: string;
        colorTag?: string;
        isFavorite?: boolean;
    }): Promise<{
        name: string;
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isTrashed: boolean;
        isFavorite: boolean;
        trashedAt: Date | null;
        path: string;
        slug: string;
        parentId: string | null;
        colorTag: string | null;
        isShared: boolean;
    }>;
    trash(id: string, userId: string, userRole: UserRole): Promise<{
        message: string;
    }>;
    restore(id: string, userId: string, userRole: UserRole): Promise<{
        name: string;
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isTrashed: boolean;
        isFavorite: boolean;
        trashedAt: Date | null;
        path: string;
        slug: string;
        parentId: string | null;
        colorTag: string | null;
        isShared: boolean;
    }>;
    getTree(userId: string): Promise<any[]>;
    private buildTree;
    private trashRecursive;
    private getPath;
}
