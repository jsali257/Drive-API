import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiSecurity, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StorageStatsService } from './storage-stats.service';

@ApiTags('Storage')
@ApiBearerAuth('jwt')
@ApiSecurity('api-key')
@UseGuards(CombinedAuthGuard, RolesGuard)
@Controller('storage')
export class StorageController {
  constructor(private storageStats: StorageStatsService) {}

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get platform-wide storage dashboard stats (Admin+)' })
  getDashboardStats() {
    return this.storageStats.getDashboardStats();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user storage stats' })
  getMyStats(@CurrentUser('id') userId: string) {
    return this.storageStats.getUserStats(userId);
  }

  @Get('growth')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get storage growth statistics (Admin+)' })
  getGrowth(@Query('days') days: number) {
    return this.storageStats.getGrowthStats(days || 30);
  }
}
