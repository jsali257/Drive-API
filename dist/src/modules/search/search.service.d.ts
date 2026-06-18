import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
export declare class SearchService {
    private prisma;
    constructor(prisma: PrismaService);
    search(userId: string, userRole: UserRole, query: {
        q: string;
        page?: number;
        limit?: number;
        type?: 'files' | 'folders' | 'all';
        extension?: string;
        mimeType?: string;
        dateFrom?: string;
        dateTo?: string;
        sizeMin?: number;
        sizeMax?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        files: never[];
        folders: never[];
        total: number;
        query?: undefined;
    } | {
        query: string;
        files: never[] | {
            description: string | null;
            displayName: string;
            id: string;
            status: import(".prisma/client").$Enums.FileStatus;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            userId: string;
            tags: string[];
            isTrashed: boolean;
            originalName: string;
            storedName: string;
            extension: string;
            mimeType: string;
            size: bigint;
            sha256Hash: string;
            storagePath: string;
            virusScanStatus: import(".prisma/client").$Enums.VirusScanStatus;
            virusScanResult: string | null;
            virusScanAt: Date | null;
            hasThumbnail: boolean;
            thumbnailPath: string | null;
            hasPreview: boolean;
            previewPath: string | null;
            downloadCount: bigint;
            versionNumber: number;
            isFavorite: boolean;
            isPublic: boolean;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            duplicateOf: string | null;
            trashedAt: Date | null;
            createdById: string;
            folderId: string | null;
        }[];
        folders: never[] | {
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
        total: number;
    }>;
}
