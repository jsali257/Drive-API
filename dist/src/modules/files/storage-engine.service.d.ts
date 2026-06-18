import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class StorageEngineService implements OnModuleInit {
    private config;
    private readonly logger;
    readonly root: string;
    readonly dirs: {
        uploads: string;
        versions: string;
        trash: string;
        thumbnails: string;
        previews: string;
        temp: string;
        shared: string;
        logs: string;
    };
    constructor(config: ConfigService);
    onModuleInit(): Promise<void>;
    getUserUploadDir(userId: string): string;
    getVersionDir(fileId: string): string;
    getThumbnailPath(storedName: string): string;
    getPreviewPath(storedName: string, ext: string): string;
    getTempChunkDir(uploadId: string): string;
    moveToTrash(storagePath: string, fileId: string): Promise<string>;
    deleteFile(filePath: string): Promise<void>;
    getDirectorySize(dir: string): Promise<bigint>;
    resolvePath(storagePath: string): string;
}
