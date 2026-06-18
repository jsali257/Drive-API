import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiSecurity, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemService } from './system.service';

@ApiTags('System')
@Controller('system')
export class SystemController {
  constructor(private systemService: SystemService) {}

  @Get('health')
  @ApiOperation({ summary: 'System health check (public)' })
  health() {
    return this.systemService.getHealth();
  }

  @Get('settings/public')
  @ApiOperation({ summary: 'Get public application settings' })
  publicSettings() {
    return this.systemService.getPublicSettings();
  }

  @Get('settings')
  @UseGuards(CombinedAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Get all settings (Admin+)' })
  settings() {
    return this.systemService.getSettings();
  }

  @Put('settings')
  @UseGuards(CombinedAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Update multiple settings (Admin+)' })
  updateSettings(@Body() body: { settings: { key: string; value: string }[] }) {
    return this.systemService.updateSettings(body.settings);
  }
}
