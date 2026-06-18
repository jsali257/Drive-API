import { UserRole, UserStatus } from '@prisma/client';
export declare class UpdateUserDto {
    email?: string;
    displayName?: string;
    role?: UserRole;
    status?: UserStatus;
    timezone?: string;
    language?: string;
}
