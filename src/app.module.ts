import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FilesModule } from './modules/files/files.module';
import { FoldersModule } from './modules/folders/folders.module';
import { SharesModule } from './modules/shares/shares.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { StorageModule } from './modules/storage/storage.module';
import { SearchModule } from './modules/search/search.module';
import { LogsModule } from './modules/logs/logs.module';
import { SystemModule } from './modules/system/system.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    FilesModule,
    FoldersModule,
    SharesModule,
    ApiKeysModule,
    StorageModule,
    SearchModule,
    LogsModule,
    SystemModule,
    NotificationsModule,
  ],
})
export class AppModule {}
