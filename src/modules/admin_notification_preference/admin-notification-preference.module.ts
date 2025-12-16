import { TypeOrmModule } from '@nestjs/typeorm';
import { forwardRef, Module } from '@nestjs/common';
import { AdminNotificationPreferenceController } from './admin-notification-preference.controller';
import { AdminNotificationPreferenceService } from './admin-notification-preference.service';
import { AdminNotificationPreference } from '../../domain/entities';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([AdminNotificationPreference]), forwardRef(() => AuthModule)],
  controllers: [AdminNotificationPreferenceController],
  providers: [AdminNotificationPreferenceService],
  exports: [AdminNotificationPreferenceService]
})
export class AdminNotificationPreferenceModule {}
