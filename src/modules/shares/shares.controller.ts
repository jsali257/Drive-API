import { Controller, Get, Post, Delete, Patch, Param, Body, Query, UseGuards, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiSecurity, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import * as fs from 'fs';
import { StreamableFile } from '@nestjs/common';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SharesService } from './shares.service';
import { ShareAccess, ShareType } from '@prisma/client';

@ApiTags('Shares')
@Controller('shares')
export class SharesController {
  constructor(private sharesService: SharesService) {}

  @Post()
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Create a share link' })
  create(
    @CurrentUser('id') userId: string,
    @Body() body: { fileId?: string; folderId?: string; type?: ShareType; access?: ShareAccess; password?: string; expiresAt?: Date; maxDownloads?: number; allowDownload?: boolean; label?: string },
  ) {
    return this.sharesService.create(userId, body);
  }

  @Get()
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'List my share links' })
  findAll(@CurrentUser('id') userId: string, @Query() query: any) {
    return this.sharesService.findAll(userId, query);
  }

  @Get(':token/access')
  @ApiOperation({ summary: 'Access a share link (public, no auth required)' })
  access(@Param('token') token: string, @Query('password') password: string, @Query('src') src: string, @Req() req: Request) {
    const ip = req.ip || req.socket?.remoteAddress;
    const referer = req.headers['referer'] || req.headers['referrer'];
    const userAgent = req.headers['user-agent'];
    return this.sharesService.access(token, password, ip, referer as string, userAgent, src);
  }

  @Get(':token/view')
  @ApiOperation({ summary: 'View/stream file inline in browser (public, no auth required)' })
  async view(
    @Param('token') token: string,
    @Query('password') password: string,
    @Query('src') src: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket?.remoteAddress;
    const referer = req.headers['referer'] || req.headers['referrer'];
    const userAgent = req.headers['user-agent'];
    const { path: filePath, file } = await this.sharesService.viewFile(token, password, ip, referer as string, userAgent, src);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.originalName)}"`,
      'Content-Length': file.size.toString(),
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    });
    return new StreamableFile(fs.createReadStream(filePath));
  }

  @Get(':token/view/:filename')
  @ApiOperation({ summary: 'View file inline with filename in URL for extension compatibility (public)' })
  async viewWithFilename(
    @Param('token') token: string,
    @Param('filename') filename: string,
    @Query('password') password: string,
    @Query('src') src: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket?.remoteAddress;
    const referer = req.headers['referer'] || req.headers['referrer'];
    const userAgent = req.headers['user-agent'];
    const { path: filePath, file } = await this.sharesService.viewFile(token, password, ip, referer as string, userAgent, src);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.originalName)}"`,
      'Content-Length': file.size.toString(),
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    });
    return new StreamableFile(fs.createReadStream(filePath));
  }

  @Get(':token/download')
  @ApiOperation({ summary: 'Download the file for a share link (public, no auth required)' })
  async download(
    @Param('token') token: string,
    @Query('password') password: string,
    @Query('src') src: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket?.remoteAddress;
    const referer = req.headers['referer'] || req.headers['referrer'];
    const userAgent = req.headers['user-agent'];
    const { path: filePath, file } = await this.sharesService.downloadFile(token, password, ip, referer as string, userAgent, src);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      'Content-Length': file.size.toString(),
    });
    return new StreamableFile(fs.createReadStream(filePath));
  }

  @Get(':id/accesses')
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Get access history for a share link' })
  accesses(@Param('id') id: string, @CurrentUser('id') userId: string, @Query() query: any) {
    return this.sharesService.getAccessHistory(id, userId, query);
  }

  @Patch(':id/revoke')
  @UseGuards(CombinedAuthGuard)
  @ApiOperation({ summary: 'Disable a share link' })
  revoke(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.sharesService.revoke(id, userId);
  }

  @Delete(':id')
  @UseGuards(CombinedAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a share link' })
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.sharesService.delete(id, userId);
  }
}
