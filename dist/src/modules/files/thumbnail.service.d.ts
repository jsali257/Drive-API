import { ConfigService } from '@nestjs/config';
import { StorageEngineService } from './storage-engine.service';
export declare class ThumbnailService {
    private config;
    private storageEngine;
    private readonly logger;
    constructor(config: ConfigService, storageEngine: StorageEngineService);
    isImage(mimeType: string): boolean;
    generateThumbnail(sourcePath: string, storedName: string): Promise<string | null>;
    generatePreview(sourcePath: string, storedName: string): Promise<string | null>;
}
