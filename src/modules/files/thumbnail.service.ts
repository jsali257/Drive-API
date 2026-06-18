import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sharp from 'sharp';
import * as path from 'path';
import { StorageEngineService } from './storage-engine.service';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

@Injectable()
export class ThumbnailService {
  private readonly logger = new Logger(ThumbnailService.name);

  constructor(
    private config: ConfigService,
    private storageEngine: StorageEngineService,
  ) {}

  isImage(mimeType: string): boolean {
    return IMAGE_TYPES.has(mimeType);
  }

  async generateThumbnail(sourcePath: string, storedName: string): Promise<string | null> {
    const thumbPath = this.storageEngine.getThumbnailPath(storedName);
    const w = this.config.get<number>('storage.thumbnailMaxWidth', 400);
    const h = this.config.get<number>('storage.thumbnailMaxHeight', 400);

    try {
      await sharp(sourcePath)
        .resize(w, h, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, progressive: true })
        .toFile(thumbPath);
      return thumbPath;
    } catch (err) {
      this.logger.warn(`Thumbnail failed for ${storedName}: ${err.message}`);
      return null;
    }
  }

  async generatePreview(sourcePath: string, storedName: string): Promise<string | null> {
    const previewPath = this.storageEngine.getPreviewPath(storedName, 'jpg');
    const w = this.config.get<number>('storage.previewMaxWidth', 1200);
    const h = this.config.get<number>('storage.previewMaxHeight', 1200);

    try {
      await sharp(sourcePath)
        .resize(w, h, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90, progressive: true })
        .toFile(previewPath);
      return previewPath;
    } catch (err) {
      this.logger.warn(`Preview failed for ${storedName}: ${err.message}`);
      return null;
    }
  }
}
