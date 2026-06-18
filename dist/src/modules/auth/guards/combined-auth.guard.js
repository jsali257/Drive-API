"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CombinedAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
let CombinedAuthGuard = class CombinedAuthGuard {
    constructor() {
        this.jwtGuard = new ((0, passport_1.AuthGuard)('jwt'))();
        this.apiKeyGuard = new ((0, passport_1.AuthGuard)('api-key'))();
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const hasBearer = !!req.headers['authorization']?.startsWith('Bearer ');
        const hasApiKey = !!req.headers['x-api-key'];
        if (!hasBearer && !hasApiKey) {
            throw new common_1.UnauthorizedException('Authentication required: provide Bearer token or X-API-Key');
        }
        try {
            if (hasBearer) {
                return (await this.jwtGuard.canActivate(context));
            }
        }
        catch { }
        try {
            if (hasApiKey) {
                return (await this.apiKeyGuard.canActivate(context));
            }
        }
        catch { }
        throw new common_1.UnauthorizedException('Invalid credentials');
    }
};
exports.CombinedAuthGuard = CombinedAuthGuard;
exports.CombinedAuthGuard = CombinedAuthGuard = __decorate([
    (0, common_1.Injectable)()
], CombinedAuthGuard);
//# sourceMappingURL=combined-auth.guard.js.map