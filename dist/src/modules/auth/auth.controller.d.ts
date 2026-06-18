import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(dto: LoginDto, req: Request): Promise<{
        user: any;
        accessToken: string;
        refreshToken: string;
    }>;
    register(dto: RegisterDto, req: Request): Promise<{
        user: any;
        accessToken: string;
        refreshToken: string;
    }>;
    refresh(dto: RefreshTokenDto, req: Request): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string, dto: RefreshTokenDto): Promise<void>;
    me(user: any): Promise<any>;
}
