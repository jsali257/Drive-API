import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
export declare class SystemService {
    private prisma;
    private config;
    constructor(prisma: PrismaService, config: ConfigService);
    getHealth(): Promise<{
        status: string;
        timestamp: string;
        uptime: number;
        version: string;
        node: string;
        platform: NodeJS.Platform;
        services: {
            database: string;
            storage: string;
        };
        system: {
            cpuCount: number;
            totalMemoryMb: number;
            freeMemoryMb: number;
            loadAvg: number[];
        };
        disk: {
            totalBytes?: number | undefined;
            freeBytes?: number | undefined;
            usedBytes?: number | undefined;
            accessible: boolean;
            path: string;
        };
    }>;
    getSettings(): Promise<{
        type: string;
        id: string;
        updatedAt: Date;
        isPublic: boolean;
        label: string | null;
        key: string;
        value: string;
        group: string;
    }[]>;
    getPublicSettings(): Promise<{
        type: string;
        id: string;
        updatedAt: Date;
        isPublic: boolean;
        label: string | null;
        key: string;
        value: string;
        group: string;
    }[]>;
    updateSetting(key: string, value: string): Promise<{
        type: string;
        id: string;
        updatedAt: Date;
        isPublic: boolean;
        label: string | null;
        key: string;
        value: string;
        group: string;
    }>;
    updateSettings(settings: {
        key: string;
        value: string;
    }[]): Promise<{
        type: string;
        id: string;
        updatedAt: Date;
        isPublic: boolean;
        label: string | null;
        key: string;
        value: string;
        group: string;
    }[]>;
    private checkDatabase;
    private getDiskInfo;
}
