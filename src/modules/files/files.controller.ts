import {
  Controller, Get, Post, Put, Delete, Patch, Param, Body, Query,
  UseGuards, UseInterceptors, UploadedFile, UploadedFiles, Res, StreamableFile,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiSecurity, ApiOperation, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FilesService } from './files.service';
import { UserRole } from '@prisma/client';

@ApiTags('Files')
@ApiBearerAuth('jwt')
@ApiSecurity('api-key')
@UseGuards(CombinedAuthGuard, RolesGuard)
@Controller('files')
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, folderId: { type: 'string' }, description: { type: 'string' }, tags: { type: 'string' } } } })
  @ApiOperation({ summary: 'Upload a single file' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    const tags = body.tags ? body.tags.split(',').map((t: string) => t.trim()) : [];
    return this.filesService.upload(file, userId, { folderId: body.folderId, description: body.description, tags });
  }

  @Post('upload/multiple')
  @UseInterceptors(FilesInterceptor('files', 20))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload multiple files at once (up to 20)' })
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser('id') userId: string,
    @Body() body: any,
  ) {
    const results = await Promise.all(
      files.map((f) => this.filesService.upload(f, userId, { folderId: body.folderId })),
    );
    return { uploaded: results.length, files: results };
  }

  @Post('chunk/init')
  @ApiOperation({ summary: 'Initialize a chunked upload session for large files' })
  initChunk(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.filesService.initChunkedUpload(userId, body);
  }

  @Post('chunk/upload')
  @UseInterceptors(FileInterceptor('chunk'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a single chunk' })
  uploadChunk(
    @UploadedFile() chunk: Express.Multer.File,
    @CurrentUser('id') userId: string,
    @Body() body: { uploadId: string; chunkIndex: number },
  ) {
    return this.filesService.uploadChunk(body.uploadId, Number(body.chunkIndex), chunk, userId);
  }

  @Post('chunk/complete')
  @ApiOperation({ summary: 'Assemble chunks and finalize the file' })
  completeChunk(@CurrentUser('id') userId: string, @Body() body: { uploadId: string }) {
    return this.filesService.completeChunkedUpload(body.uploadId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List files' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'folderId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'extension', required: false })
  @ApiQuery({ name: 'isTrashed', required: false, type: Boolean })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  findAll(@CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole, @Query() query: any) {
    return this.filesService.findAll(userId, role, query);
  }

  @Get('trash')
  @ApiOperation({ summary: 'List trashed files' })
  trash(@CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole, @Query() query: any) {
    return this.filesService.findAll(userId, role, { ...query, isTrashed: true });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file metadata by ID' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole) {
    return this.filesService.findOne(id, userId, role);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download file by ID (streams from disk)' })
  async download(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { path: filePath, file } = await this.filesService.downloadStream(id, userId, role);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
      'Content-Length': file.size.toString(),
    });
    const stream = fs.createReadStream(filePath);
    return new StreamableFile(stream);
  }

  @Get(':id/thumbnail')
  @ApiOperation({ summary: 'Get image thumbnail' })
  async thumbnail(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.filesService.findOne(id, userId, role);
    if (!file.hasThumbnail || !file.thumbnailPath) {
      return res.status(404).json({ message: 'No thumbnail available' });
    }
    res.set({ 'Content-Type': 'image/jpeg' });
    return new StreamableFile(fs.createReadStream(file.thumbnailPath));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update file metadata' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() body: { displayName?: string; description?: string; tags?: string[]; folderId?: string; isFavorite?: boolean },
  ) {
    return this.filesService.update(id, userId, role, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Move file to trash' })
  @HttpCode(HttpStatus.OK)
  trash_file(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole) {
    return this.filesService.trash(id, userId, role);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore file from trash' })
  restore(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole) {
    return this.filesService.restore(id, userId, role);
  }

  @Delete(':id/permanent')
  @ApiOperation({ summary: 'Permanently delete file' })
  @HttpCode(HttpStatus.OK)
  permanentDelete(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole) {
    return this.filesService.permanentDelete(id, userId, role);
  }

  @Post('bulk/trash')
  @ApiOperation({ summary: 'Move multiple files to trash' })
  bulkTrash(
    @Body() body: { ids: string[] },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.filesService.bulkTrash(body.ids, userId, role);
  }
}
