import { UserRole } from '@prisma/client';
import { FoldersService } from './folders.service';
export declare class FoldersController {
    private foldersService;
    constructor(foldersService: FoldersService);
    create(userId: string, body: {
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
    findAll(userId: string, role: UserRole, query: any): Promise<import("../../common/utils/pagination.util").PaginatedResult<{
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
    tree(userId: string): Promise<any[]>;
    findOne(id: string, userId: string, role: UserRole): Promise<{
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
    update(id: string, userId: string, role: UserRole, body: {
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
    trash(id: string, userId: string, role: UserRole): Promise<{
        message: string;
    }>;
    restore(id: string, userId: string, role: UserRole): Promise<{
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
}
