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
exports.StorageController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const combined_auth_guard_1 = require("../auth/guards/combined-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const storage_stats_service_1 = require("./storage-stats.service");
let StorageController = class StorageController {
    constructor(storageStats) {
        this.storageStats = storageStats;
    }
    getDashboardStats() {
        return this.storageStats.getDashboardStats();
    }
    getMyStats(userId) {
        return this.storageStats.getUserStats(userId);
    }
    getGrowth(days) {
        return this.storageStats.getGrowthStats(days || 30);
    }
};
exports.StorageController = StorageController;
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get platform-wide storage dashboard stats (Admin+)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StorageController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user storage stats' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StorageController.prototype, "getMyStats", null);
__decorate([
    (0, common_1.Get)('growth'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get storage growth statistics (Admin+)' }),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], StorageController.prototype, "getGrowth", null);
exports.StorageController = StorageController = __decorate([
    (0, swagger_1.ApiTags)('Storage'),
    (0, swagger_1.ApiBearerAuth)('jwt'),
    (0, swagger_1.ApiSecurity)('api-key'),
    (0, common_1.UseGuards)(combined_auth_guard_1.CombinedAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('storage'),
    __metadata("design:paramtypes", [storage_stats_service_1.StorageStatsService])
], StorageController);
//# sourceMappingURL=storage.controller.js.map