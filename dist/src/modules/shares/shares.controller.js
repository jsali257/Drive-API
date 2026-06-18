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
exports.SharesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const fs = require("fs");
const common_2 = require("@nestjs/common");
const combined_auth_guard_1 = require("../auth/guards/combined-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const shares_service_1 = require("./shares.service");
let SharesController = class SharesController {
    constructor(sharesService) {
        this.sharesService = sharesService;
    }
    create(userId, body) {
        return this.sharesService.create(userId, body);
    }
    findAll(userId, query) {
        return this.sharesService.findAll(userId, query);
    }
    access(token, password, req) {
        const ip = req.ip || req.socket?.remoteAddress;
        return this.sharesService.access(token, password, ip);
    }
    async view(token, password, req, res) {
        const ip = req.ip || req.socket?.remoteAddress;
        const { path: filePath, file } = await this.sharesService.viewFile(token, password, ip);
        res.set({
            'Content-Type': file.mimeType,
            'Content-Disposition': `inline; filename="${encodeURIComponent(file.originalName)}"`,
            'Content-Length': file.size.toString(),
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
        });
        return new common_2.StreamableFile(fs.createReadStream(filePath));
    }
    async viewWithFilename(token, filename, password, req, res) {
        const ip = req.ip || req.socket?.remoteAddress;
        const { path: filePath, file } = await this.sharesService.viewFile(token, password, ip);
        res.set({
            'Content-Type': file.mimeType,
            'Content-Disposition': `inline; filename="${encodeURIComponent(file.originalName)}"`,
            'Content-Length': file.size.toString(),
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
        });
        return new common_2.StreamableFile(fs.createReadStream(filePath));
    }
    async download(token, password, req, res) {
        const ip = req.ip || req.socket?.remoteAddress;
        const { path: filePath, file } = await this.sharesService.downloadFile(token, password, ip);
        res.set({
            'Content-Type': file.mimeType,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
            'Content-Length': file.size.toString(),
        });
        return new common_2.StreamableFile(fs.createReadStream(filePath));
    }
    revoke(id, userId) {
        return this.sharesService.revoke(id, userId);
    }
    delete(id, userId) {
        return this.sharesService.delete(id, userId);
    }
};
exports.SharesController = SharesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(combined_auth_guard_1.CombinedAuthGuard),
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, swagger_1.ApiSecurity)('api-key'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a share link' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SharesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(combined_auth_guard_1.CombinedAuthGuard),
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, swagger_1.ApiSecurity)('api-key'),
    (0, swagger_1.ApiOperation)({ summary: 'List my share links' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SharesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':token/access'),
    (0, swagger_1.ApiOperation)({ summary: 'Access a share link (public, no auth required)' }),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Query)('password')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], SharesController.prototype, "access", null);
__decorate([
    (0, common_1.Get)(':token/view'),
    (0, swagger_1.ApiOperation)({ summary: 'View/stream file inline in browser (public, no auth required)' }),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Query)('password')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], SharesController.prototype, "view", null);
__decorate([
    (0, common_1.Get)(':token/view/:filename'),
    (0, swagger_1.ApiOperation)({ summary: 'View file inline with filename in URL for extension compatibility (public)' }),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('filename')),
    __param(2, (0, common_1.Query)('password')),
    __param(3, (0, common_1.Req)()),
    __param(4, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], SharesController.prototype, "viewWithFilename", null);
__decorate([
    (0, common_1.Get)(':token/download'),
    (0, swagger_1.ApiOperation)({ summary: 'Download the file for a share link (public, no auth required)' }),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Query)('password')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], SharesController.prototype, "download", null);
__decorate([
    (0, common_1.Patch)(':id/revoke'),
    (0, common_1.UseGuards)(combined_auth_guard_1.CombinedAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Disable a share link' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SharesController.prototype, "revoke", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(combined_auth_guard_1.CombinedAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a share link' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SharesController.prototype, "delete", null);
exports.SharesController = SharesController = __decorate([
    (0, swagger_1.ApiTags)('Shares'),
    (0, common_1.Controller)('shares'),
    __metadata("design:paramtypes", [shares_service_1.SharesService])
], SharesController);
//# sourceMappingURL=shares.controller.js.map