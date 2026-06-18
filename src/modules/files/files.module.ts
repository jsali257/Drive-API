import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as multer from 'multer';
import * as path from 'path';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { StorageEngineService } from './storage-engine.service';
import { ThumbnailService } from './thumbnail.service';
import { AuthModule } from '../auth/auth.module';
import { multerFileFilter } from '../../common/utils/file-filter.util';

@Module({
  imports: [
    AuthModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: multer.diskStorage({
          destination: (req, file, cb) => {
            const tempDir = path.join(config.get<string>('storage.root') ?? 'D:\\Storage', 'temp');
            cb(null, tempDir);
          },
          filename: (req, file, cb) => {
            const unique = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
            cb(null, unique);
          },
        }),
        fileFilter: multerFileFilter,
        limits: {
          fileSize: (config.get<number>('storage.maxFileSizeMb') ?? 5000) * 1024 * 1024,
        },
      }),
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService, StorageEngineService, ThumbnailService],
  exports: [FilesService, StorageEngineService],
})
export class FilesModule {}
