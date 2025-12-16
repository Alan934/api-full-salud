import { TypeOrmModule } from '@nestjs/typeorm';
import { forwardRef, Module } from '@nestjs/common';
import { SecretaryNotificationPreference } from '../../domain/entities';
import { SecretaryNotificationPreferenceController } from './secretary-notification-preference.controller';
import { SecretaryNotificationPreferenceService } from './secretary-notification-preference.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([SecretaryNotificationPreference]), forwardRef(() => AuthModule)],
  controllers: [SecretaryNotificationPreferenceController],
  providers: [SecretaryNotificationPreferenceService],
  exports: [SecretaryNotificationPreferenceService]
})
export class SecretaryNotificationPreferenceModule {}
