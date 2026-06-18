import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class CombinedAuthGuard implements CanActivate {
    private jwtGuard;
    private apiKeyGuard;
    canActivate(context: ExecutionContext): Promise<boolean>;
}
