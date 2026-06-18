import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageStatsService } from './storage-stats.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [StorageController],
  providers: [StorageStatsService],
  exports: [StorageStatsService],
})
export class StorageModule {}
