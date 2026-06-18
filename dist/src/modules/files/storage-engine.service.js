"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StorageEngineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageEngineService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = require("fs");
const path = require("path");
let StorageEngineService = StorageEngineService_1 = class StorageEngineService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(StorageEngineService_1.name);
        this.dirs = {
            uploads: '',
            versions: '',
            trash: '',
            thumbnails: '',
            previews: '',
            temp: '',
            shared: '',
            logs: '',
        };
        this.root = config.get('storage.root', 'D:\\Storage');
        for (const key of Object.keys(this.dirs)) {
            this.dirs[key] = path.join(this.root, key);
        }
    }
    async onModuleInit() {
        for (const dir of Object.values(this.dirs)) {
            await fs.promises.mkdir(dir, { recursive: true });
        }
        this.logger.log(`Storage root: ${this.root}`);
    }
    getUserUploadDir(userId) {
        const now = new Date();
        const dir = path.join(this.dirs.uploads, userId, `${now.getFullYear()}`, String(now.getMonth() + 1).padStart(2, '0'));
        fs.mkdirSync(dir, { recursive: true });
        return dir;
    }
    getVersionDir(fileId) {
        const dir = path.join(this.dirs.versions, fileId);
        fs.mkdirSync(dir, { recursive: true });
        return dir;
    }
    getThumbnailPath(storedName) {
        return path.join(this.dirs.thumbnails, `${storedName}.jpg`);
    }
    getPreviewPath(storedName, ext) {
        return path.join(this.dirs.previews, `${storedName}.${ext}`);
    }
    getTempChunkDir(uploadId) {
        const dir = path.join(this.dirs.temp, uploadId);
        fs.mkdirSync(dir, { recursive: true });
        return dir;
    }
    async moveToTrash(storagePath, fileId) {
        const trashPath = path.join(this.dirs.trash, path.basename(storagePath));
        await fs.promises.rename(storagePath, trashPath);
        return trashPath;
    }
    async deleteFile(filePath) {
        try {
            await fs.promises.unlink(filePath);
        }
        catch (err) {
            if (err.code !== 'ENOENT')
                throw err;
        }
    }
    async getDirectorySize(dir) {
        let total = 0n;
        try {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    total += await this.getDirectorySize(full);
                }
                else {
                    const stat = await fs.promises.stat(full);
                    total += BigInt(stat.size);
                }
            }
        }
        catch { }
        return total;
    }
    resolvePath(storagePath) {
        const resolved = path.resolve(storagePath);
        if (!resolved.startsWith(path.resolve(this.root))) {
            throw new Error('Path traversal attempt detected');
        }
        return resolved;
    }
};
exports.StorageEngineService = StorageEngineService;
exports.StorageEngineService = StorageEngineService = StorageEngineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StorageEngineService);
//# sourceMappingURL=storage-engine.service.js.map