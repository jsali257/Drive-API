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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const fs = require("fs");
const combined_auth_guard_1 = require("../auth/guards/combined-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const files_service_1 = require("./files.service");
const client_1 = require("@prisma/client");
let FilesController = class FilesController {
    constructor(filesService) {
        this.filesService = filesService;
    }
    async upload(file, userId, body) {
        const tags = body.tags ? body.tags.split(',').map((t) => t.trim()) : [];
        return this.filesService.upload(file, userId, { folderId: body.folderId, description: body.description, tags });
    }
    async uploadMultiple(files, userId, body) {
        const results = await Promise.all(files.map((f) => this.filesService.upload(f, userId, { folderId: body.folderId })));
        return { uploaded: results.length, files: results };
    }
    initChunk(userId, body) {
        return this.filesService.initChunkedUpload(userId, body);
    }
    uploadChunk(chunk, userId, body) {
        return this.filesService.uploadChunk(body.uploadId, Number(body.chunkIndex), chunk, userId);
    }
    completeChunk(userId, body) {
        return this.filesService.completeChunkedUpload(body.uploadId, userId);
    }
    findAll(userId, role, query) {
        return this.filesService.findAll(userId, role, query);
    }
    trash(userId, role, query) {
        return this.filesService.findAll(userId, role, { ...query, isTrashed: true });
    }
    findOne(id, userId, role) {
        return this.filesService.findOne(id, userId, role);
    }
    async download(id, userId, role, res) {
        const { path: filePath, file } = await this.filesService.downloadStream(id, userId, role);
        res.set({
            'Content-Type': file.mimeType,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
            'Content-Length': file.size.toString(),
        });
        const stream = fs.createReadStream(filePath);
        return new common_1.StreamableFile(stream);
    }
    async thumbnail(id, userId, role, res) {
        const file = await this.filesService.findOne(id, userId, role);
        if (!file.hasThumbnail || !file.thumbnailPath) {
            return res.status(404).json({ message: 'No thumbnail available' });
        }
        res.set({ 'Content-Type': 'image/jpeg' });
        return new common_1.StreamableFile(fs.createReadStream(file.thumbnailPath));
    }
    update(id, userId, role, body) {
        return this.filesService.update(id, userId, role, body);
    }
    trash_file(id, userId, role) {
        return this.filesService.trash(id, userId, role);
    }
    restore(id, userId, role) {
        return this.filesService.restore(id, userId, role);
    }
    permanentDelete(id, userId, role) {
        return this.filesService.permanentDelete(id, userId, role);
    }
    bulkTrash(body, userId, role) {
        return this.filesService.bulkTrash(body.ids, userId, role);
    }
};
exports.FilesController = FilesController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, folderId: { type: 'string' }, description: { type: 'string' }, tags: { type: 'string' } } } }),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a single file' }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "upload", null);
__decorate([
    (0, common_1.Post)('upload/multiple'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 20)),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload multiple files at once (up to 20)' }),
    __param(0, (0, common_1.UploadedFiles)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, String, Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "uploadMultiple", null);
__decorate([
    (0, common_1.Post)('chunk/init'),
    (0, swagger_1.ApiOperation)({ summary: 'Initialize a chunked upload session for large files' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FilesController.prototype, "initChunk", null);
__decorate([
    (0, common_1.Post)('chunk/upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('chunk')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a single chunk' }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], FilesController.prototype, "uploadChunk", null);
__decorate([
    (0, common_1.Post)('chunk/complete'),
    (0, swagger_1.ApiOperation)({ summary: 'Assemble chunks and finalize the file' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], FilesController.prototype, "completeChunk", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List files' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'folderId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'extension', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'isTrashed', required: false, type: Boolean }),
    (0, swagger_1.ApiQuery)({ name: 'sortBy', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('role')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], FilesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('trash'),
    (0, swagger_1.ApiOperation)({ summary: 'List trashed files' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('role')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], FilesController.prototype, "trash", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get file metadata by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], FilesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/download'),
    (0, swagger_1.ApiOperation)({ summary: 'Download file by ID (streams from disk)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('role')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "download", null);
__decorate([
    (0, common_1.Get)(':id/thumbnail'),
    (0, swagger_1.ApiOperation)({ summary: 'Get image thumbnail' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('role')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "thumbnail", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update file metadata' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('role')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], FilesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Move file to trash' }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], FilesController.prototype, "trash_file", null);
__decorate([
    (0, common_1.Patch)(':id/restore'),
    (0, swagger_1.ApiOperation)({ summary: 'Restore file from trash' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], FilesController.prototype, "restore", null);
__decorate([
    (0, common_1.Delete)(':id/permanent'),
    (0, swagger_1.ApiOperation)({ summary: 'Permanently delete file' }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], FilesController.prototype, "permanentDelete", null);
__decorate([
    (0, common_1.Post)('bulk/trash'),
    (0, swagger_1.ApiOperation)({ summary: 'Move multiple files to trash' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], FilesController.prototype, "bulkTrash", null);
exports.FilesController = FilesController = __decorate([
    (0, swagger_1.ApiTags)('Files'),
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, swagger_1.ApiSecurity)('api-key'),
    (0, common_1.UseGuards)(combined_auth_guard_1.CombinedAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('files'),
    __metadata("design:paramtypes", [files_service_1.FilesService])
], FilesController);
//# sourceMappingURL=files.controller.js.map