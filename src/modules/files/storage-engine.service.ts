import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageEngineService implements OnModuleInit {
  private readonly logger = new Logger(StorageEngineService.name);
  readonly root: string;

  readonly dirs = {
    uploads: '',
    versions: '',
    trash: '',
    thumbnails: '',
    previews: '',
    temp: '',
    shared: '',
    logs: '',
  };

  constructor(private config: ConfigService) {
    this.root = config.get<string>('storage.root', 'D:\\Storage');
    for (const key of Object.keys(this.dirs) as (keyof typeof this.dirs)[]) {
      this.dirs[key] = path.join(this.root, key);
    }
  }

  async onModuleInit() {
    for (const dir of Object.values(this.dirs)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    this.logger.log(`Storage root: ${this.root}`);
  }

  getUserUploadDir(userId: string): string {
    const now = new Date();
    const dir = path.join(this.dirs.uploads, userId, `${now.getFullYear()}`, String(now.getMonth() + 1).padStart(2, '0'));
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  getVersionDir(fileId: string): string {
    const dir = path.join(this.dirs.versions, fileId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  getThumbnailPath(storedName: string): string {
    return path.join(this.dirs.thumbnails, `${storedName}.jpg`);
  }

  getPreviewPath(storedName: string, ext: string): string {
    return path.join(this.dirs.previews, `${storedName}.${ext}`);
  }

  getTempChunkDir(uploadId: string): string {
    const dir = path.join(this.dirs.temp, uploadId);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  async moveToTrash(storagePath: string, fileId: string): Promise<string> {
    const trashPath = path.join(this.dirs.trash, path.basename(storagePath));
    await fs.promises.rename(storagePath, trashPath);
    return trashPath;
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch (err) {
      if ((err as any).code !== 'ENOENT') throw err;
    }
  }

  async getDirectorySize(dir: string): Promise<bigint> {
    let total = 0n;
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          total += await this.getDirectorySize(full);
        } else {
          const stat = await fs.promises.stat(full);
          total += BigInt(stat.size);
        }
      }
    } catch {}
    return total;
  }

  resolvePath(storagePath: string): string {
    const resolved = path.resolve(storagePath);
    if (!resolved.startsWith(path.resolve(this.root))) {
      throw new Error('Path traversal attempt detected');
    }
    return resolved;
  }
}
