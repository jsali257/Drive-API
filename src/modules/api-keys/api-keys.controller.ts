import { Controller, Get, Post, Delete, Patch, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiSecurity, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiKeysService } from './api-keys.service';

@ApiTags('API Keys')
@ApiBearerAuth('jwt')
@ApiSecurity('api-key')
@UseGuards(CombinedAuthGuard, RolesGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private apiKeysService: ApiKeysService) {}

  @Post()
  @Roles(UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Create a new API key (Developer+)' })
  create(
    @CurrentUser('id') userId: string,
    @Body() body: { name: string; permissions?: string[]; allowedIps?: string[]; rateLimitPerMin?: number; expiresAt?: Date; description?: string },
  ) {
    return this.apiKeysService.create(userId, body);
  }

  @Get()
  @Roles(UserRole.DEVELOPER)
  @ApiOperation({ summary: 'List API keys' })
  findAll(@CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole, @Query() query: any) {
    return this.apiKeysService.findAll(userId, role, query);
  }

  @Get(':id/usage')
  @Roles(UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Get API key usage stats' })
  usage(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole) {
    return this.apiKeysService.getUsageStats(id, userId, role);
  }

  @Patch(':id/revoke')
  @Roles(UserRole.DEVELOPER)
  @ApiOperation({ summary: 'Revoke an API key' })
  revoke(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole) {
    return this.apiKeysService.revoke(id, userId, role);
  }

  @Delete(':id')
  @Roles(UserRole.DEVELOPER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an API key' })
  delete(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole) {
    return this.apiKeysService.delete(id, userId, role);
  }
}
