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
var ThumbnailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThumbnailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sharp = require("sharp");
const storage_engine_service_1 = require("./storage-engine.service");
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
let ThumbnailService = ThumbnailService_1 = class ThumbnailService {
    constructor(config, storageEngine) {
        this.config = config;
        this.storageEngine = storageEngine;
        this.logger = new common_1.Logger(ThumbnailService_1.name);
    }
    isImage(mimeType) {
        return IMAGE_TYPES.has(mimeType);
    }
    async generateThumbnail(sourcePath, storedName) {
        const thumbPath = this.storageEngine.getThumbnailPath(storedName);
        const w = this.config.get('storage.thumbnailMaxWidth', 400);
        const h = this.config.get('storage.thumbnailMaxHeight', 400);
        try {
            await sharp(sourcePath)
                .resize(w, h, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 80, progressive: true })
                .toFile(thumbPath);
            return thumbPath;
        }
        catch (err) {
            this.logger.warn(`Thumbnail failed for ${storedName}: ${err.message}`);
            return null;
        }
    }
    async generatePreview(sourcePath, storedName) {
        const previewPath = this.storageEngine.getPreviewPath(storedName, 'jpg');
        const w = this.config.get('storage.previewMaxWidth', 1200);
        const h = this.config.get('storage.previewMaxHeight', 1200);
        try {
            await sharp(sourcePath)
                .resize(w, h, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 90, progressive: true })
                .toFile(previewPath);
            return previewPath;
        }
        catch (err) {
            this.logger.warn(`Preview failed for ${storedName}: ${err.message}`);
            return null;
        }
    }
};
exports.ThumbnailService = ThumbnailService;
exports.ThumbnailService = ThumbnailService = ThumbnailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        storage_engine_service_1.StorageEngineService])
], ThumbnailService);
//# sourceMappingURL=thumbnail.service.js.map