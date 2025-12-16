import { TypeOrmModule } from '@nestjs/typeorm';
import { forwardRef, Module } from '@nestjs/common';
import { PractitionerSecretaryNotificationPreferences } from '../../domain/entities';
import { PractitionerSecretaryNotificationPreferencesController } from './practitioner-secretary-notification-preferences.controller';
import { PractitionerSecretaryNotificationPreferencesService } from './practitioner-secretary-notification-preferences.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PractitionerSecretaryNotificationPreferences]), forwardRef(() => AuthModule)
  ],
  controllers: [PractitionerSecretaryNotificationPreferencesController],
  providers: [PractitionerSecretaryNotificationPreferencesService],
  exports: [PractitionerSecretaryNotificationPreferencesService]
})
export class PractitionerSecretaryNotificationPreferencesModule {}
