import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { AuthService } from '../auth.service';
declare const ApiKeyStrategy_base: new (...args: any[]) => Strategy;
export declare class ApiKeyStrategy extends ApiKeyStrategy_base {
    private authService;
    constructor(authService: AuthService);
    validate(req: Request): Promise<{
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
    }>;
}
export {};
