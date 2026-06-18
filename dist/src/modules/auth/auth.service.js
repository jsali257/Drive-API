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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const date_fns_1 = require("date-fns");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, jwt, config) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async login(dto, ip, userAgent) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
        if (!user) {
            await this.logAudit(null, client_1.AuditAction.LOGIN_FAILED, ip, { email: dto.email });
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (user.status === client_1.UserStatus.SUSPENDED) {
            throw new common_1.ForbiddenException('Account suspended');
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            throw new common_1.ForbiddenException(`Account locked until ${user.lockedUntil.toISOString()}`);
        }
        const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordValid) {
            const maxAttempts = this.config.get('security.maxLoginAttempts', 5);
            const newAttempts = user.loginAttempts + 1;
            const lockout = newAttempts >= maxAttempts
                ? (0, date_fns_1.addMinutes)(new Date(), this.config.get('security.lockoutMinutes', 15))
                : null;
            await this.prisma.user.update({
                where: { id: user.id },
                data: { loginAttempts: newAttempts, lockedUntil: lockout },
            });
            await this.logAudit(user.id, client_1.AuditAction.LOGIN_FAILED, ip, { attempts: newAttempts });
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { loginAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: ip },
        });
        const tokens = await this.generateTokens(user.id, ip, userAgent);
        await this.logAudit(user.id, client_1.AuditAction.LOGIN, ip, {});
        return { ...tokens, user: this.sanitizeUser(user) };
    }
    async register(dto, ip) {
        const existing = await this.prisma.user.findFirst({
            where: { OR: [{ email: dto.email.toLowerCase() }, { username: dto.username.toLowerCase() }] },
        });
        if (existing) {
            throw new common_1.ConflictException(existing.email === dto.email.toLowerCase() ? 'Email already in use' : 'Username already taken');
        }
        const rounds = this.config.get('security.bcryptRounds', 12);
        const passwordHash = await bcrypt.hash(dto.password, rounds);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email.toLowerCase(),
                username: dto.username.toLowerCase(),
                displayName: dto.displayName || dto.username,
                passwordHash,
            },
        });
        await this.logAudit(user.id, client_1.AuditAction.USER_CREATED, ip, {});
        const tokens = await this.generateTokens(user.id, ip);
        return { ...tokens, user: this.sanitizeUser(user) };
    }
    async refreshTokens(refreshToken, ip) {
        const hash = this.hashToken(refreshToken);
        const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
        if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } });
        const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
        if (!user || user.status !== client_1.UserStatus.ACTIVE) {
            throw new common_1.UnauthorizedException('User not found or inactive');
        }
        return this.generateTokens(user.id, ip);
    }
    async logout(userId, refreshToken) {
        if (refreshToken) {
            const hash = this.hashToken(refreshToken);
            await this.prisma.refreshToken.updateMany({
                where: { tokenHash: hash, userId },
                data: { isRevoked: true },
            });
        }
        await this.logAudit(userId, client_1.AuditAction.LOGOUT, undefined, {});
    }
    async validateApiKey(rawKey, ip) {
        const prefix = rawKey.substring(0, 12);
        const hash = this.hashToken(rawKey);
        const apiKey = await this.prisma.apiKey.findUnique({
            where: { keyHash: hash },
            include: { user: true },
        });
        if (!apiKey || apiKey.status !== 'ACTIVE')
            return null;
        if (apiKey.expiresAt && apiKey.expiresAt < new Date())
            return null;
        if (apiKey.allowedIps.length > 0 && ip && !apiKey.allowedIps.includes(ip))
            return null;
        await this.prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date(), lastUsedIp: ip, usageCount: { increment: 1 } },
        });
        return { ...apiKey.user, apiKeyId: apiKey.id, apiKeyPermissions: apiKey.permissions };
    }
    async generateTokens(userId, ip, userAgent) {
        const accessToken = this.jwt.sign({ sub: userId, type: 'access' }, {
            secret: this.config.get('jwt.secret'),
            expiresIn: this.config.get('jwt.expiresIn'),
        });
        const rawRefresh = crypto.randomBytes(64).toString('hex');
        const refreshHash = this.hashToken(rawRefresh);
        const refreshExpiry = (0, date_fns_1.addDays)(new Date(), 7);
        await this.prisma.refreshToken.create({
            data: {
                userId,
                tokenHash: refreshHash,
                ipAddress: ip,
                userAgent,
                expiresAt: refreshExpiry,
            },
        });
        return { accessToken, refreshToken: rawRefresh };
    }
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    sanitizeUser(user) {
        const { passwordHash, twoFactorSecret, emailVerifyToken, resetPasswordToken, ...safe } = user;
        return safe;
    }
    async logAudit(userId, action, ip, details) {
        await this.prisma.auditLog.create({
            data: { userId, action, ipAddress: ip, details, success: action !== client_1.AuditAction.LOGIN_FAILED },
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map