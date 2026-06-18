import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiSecurity, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LogsService } from './logs.service';

@ApiTags('Logs')
@ApiBearerAuth('jwt')
@ApiSecurity('api-key')
@UseGuards(CombinedAuthGuard, RolesGuard)
@Controller('logs')
export class LogsController {
  constructor(private logsService: LogsService) {}

  @Get('audit')
  @ApiOperation({ summary: 'Get audit logs' })
  getAuditLogs(@CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole, @Query() query: any) {
    return this.logsService.getAuditLogs(userId, role, query);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get activity logs' })
  getActivityLogs(@CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole, @Query() query: any) {
    return this.logsService.getActivityLogs(userId, role, query);
  }
}
