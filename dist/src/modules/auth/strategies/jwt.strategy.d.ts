import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private config;
    private prisma;
    constructor(config: ConfigService, prisma: PrismaService);
    validate(payload: {
        sub: string;
        type: string;
    }): Promise<{
        email: string;
        username: string;
        displayName: string | null;
        id: string;
        role: import(".prisma/client").$Enums.UserRole;
        status: import(".prisma/client").$Enums.UserStatus;
        avatar: string | null;
        twoFactorEnabled: boolean;
        storageQuotaBytes: bigint;
        storageUsedBytes: bigint;
        createdAt: Date;
    }>;
}
export {};
