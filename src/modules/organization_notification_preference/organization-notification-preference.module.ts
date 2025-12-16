import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationNotificationPreference } from '../../domain/entities';
import { OrganizationNotificationPreferenceController } from './organization-notification-preference.controller';
import { OrganizationNotificationPreferenceService } from './organization-notification-preference.service';
import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationNotificationPreference]), forwardRef(() => AuthModule)],
  controllers: [OrganizationNotificationPreferenceController],
  providers: [OrganizationNotificationPreferenceService],
  exports: [OrganizationNotificationPreferenceService]
})
export class OrganizationNotificationPreferenceModule {}
