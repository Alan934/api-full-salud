import { TypeOrmModule } from '@nestjs/typeorm';
import { PractitionerNotificationPreference } from '../../domain/entities';
import { forwardRef, Module } from '@nestjs/common';
import { PractitionerNotificationPreferenceController } from './practitioner-notification-preference.controller';
import { PractitionerNotificationPreferenceService } from './practitioner-notification-preference.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([PractitionerNotificationPreference]), forwardRef(() => AuthModule)],
  controllers: [PractitionerNotificationPreferenceController],
  providers: [PractitionerNotificationPreferenceService],
  exports: [PractitionerNotificationPreferenceService]
})
export class PractitionerNotificationPreferenceModule {}
