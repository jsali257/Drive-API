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
exports.ApiKeysController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const combined_auth_guard_1 = require("../auth/guards/combined-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const api_keys_service_1 = require("./api-keys.service");
let ApiKeysController = class ApiKeysController {
    constructor(apiKeysService) {
        this.apiKeysService = apiKeysService;
    }
    create(userId, body) {
        return this.apiKeysService.create(userId, body);
    }
    findAll(userId, role, query) {
        return this.apiKeysService.findAll(userId, role, query);
    }
    usage(id, userId, role) {
        return this.apiKeysService.getUsageStats(id, userId, role);
    }
    revoke(id, userId, role) {
        return this.apiKeysService.revoke(id, userId, role);
    }
    delete(id, userId, role) {
        return this.apiKeysService.delete(id, userId, role);
    }
};
exports.ApiKeysController = ApiKeysController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.DEVELOPER),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new API key (Developer+)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ApiKeysController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.DEVELOPER),
    (0, swagger_1.ApiOperation)({ summary: 'List API keys' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('role')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], ApiKeysController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id/usage'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.DEVELOPER),
    (0, swagger_1.ApiOperation)({ summary: 'Get API key usage stats' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ApiKeysController.prototype, "usage", null);
__decorate([
    (0, common_1.Patch)(':id/revoke'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.DEVELOPER),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke an API key' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ApiKeysController.prototype, "revoke", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.DEVELOPER),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete an API key' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ApiKeysController.prototype, "delete", null);
exports.ApiKeysController = ApiKeysController = __decorate([
    (0, swagger_1.ApiTags)('API Keys'),
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, swagger_1.ApiSecurity)('api-key'),
    (0, common_1.UseGuards)(combined_auth_guard_1.CombinedAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('api-keys'),
    __metadata("design:paramtypes", [api_keys_service_1.ApiKeysService])
], ApiKeysController);
//# sourceMappingURL=api-keys.controller.js.map