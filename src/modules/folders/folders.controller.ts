import { Controller, Get, Post, Put, Delete, Patch, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiSecurity, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FoldersService } from './folders.service';

@ApiTags('Folders')
@ApiBearerAuth('jwt')
@ApiSecurity('api-key')
@UseGuards(CombinedAuthGuard, RolesGuard)
@Controller('folders')
export class FoldersController {
  constructor(private foldersService: FoldersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new folder' })
  create(@CurrentUser('id') userId: string, @Body() body: { name: string; parentId?: string; description?: string; colorTag?: string }) {
    return this.foldersService.create(userId, body);
  }

  @Get()
  @ApiOperation({ summary: 'List folders' })
  findAll(@CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole, @Query() query: any) {
    return this.foldersService.findAll(userId, role, query);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get full folder tree for current user' })
  tree(@CurrentUser('id') userId: string) {
    return this.foldersService.getTree(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get folder by ID' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole) {
    return this.foldersService.findOne(id, userId, role);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update folder' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() body: { name?: string; description?: string; colorTag?: string; isFavorite?: boolean },
  ) {
    return this.foldersService.update(id, userId, role, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move folder to trash (recursive)' })
  trash(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole) {
    return this.foldersService.trash(id, userId, role);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore folder from trash' })
  restore(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole) {
    return this.foldersService.restore(id, userId, role);
  }
}
