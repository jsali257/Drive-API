import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthService {
    private prisma;
    private jwt;
    private config;
    private readonly logger;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService);
    login(dto: LoginDto, ip?: string, userAgent?: string): Promise<{
        user: any;
        accessToken: string;
        refreshToken: string;
    }>;
    register(dto: RegisterDto, ip?: string): Promise<{
        user: any;
        accessToken: string;
        refreshToken: string;
    }>;
    refreshTokens(refreshToken: string, ip?: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string, refreshToken?: string): Promise<void>;
    validateApiKey(rawKey: string, ip?: string): Promise<{
        apiKeyId: string;
        apiKeyPermissions: string[];
        email: string;
        username: string;
        displayName: string | null;
        id: string;
        passwordHash: string;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        avatar: string | null;
        twoFactorSecret: string | null;
        twoFactorEnabled: boolean;
        emailVerified: boolean;
        emailVerifyToken: string | null;
        resetPasswordToken: string | null;
        resetPasswordExpiry: Date | null;
        loginAttempts: number;
        lockedUntil: Date | null;
        lastLoginAt: Date | null;
        lastLoginIp: string | null;
        storageQuotaBytes: bigint;
        storageUsedBytes: bigint;
        timezone: string;
        language: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    } | null>;
    private generateTokens;
    private hashToken;
    private sanitizeUser;
    private logAudit;
}
