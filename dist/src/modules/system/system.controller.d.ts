import { SystemService } from './system.service';
export declare class SystemController {
    private systemService;
    constructor(systemService: SystemService);
    health(): Promise<{
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
    publicSettings(): Promise<{
        type: string;
        id: string;
        updatedAt: Date;
        isPublic: boolean;
        label: string | null;
        key: string;
        value: string;
        group: string;
    }[]>;
    settings(): Promise<{
        type: string;
        id: string;
        updatedAt: Date;
        isPublic: boolean;
        label: string | null;
        key: string;
        value: string;
        group: string;
    }[]>;
    updateSettings(body: {
        settings: {
            key: string;
            value: string;
        }[];
    }): Promise<{
        type: string;
        id: string;
        updatedAt: Date;
        isPublic: boolean;
        label: string | null;
        key: string;
        value: string;
        group: string;
    }[]>;
}
