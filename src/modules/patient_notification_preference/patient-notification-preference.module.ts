import { TypeOrmModule } from '@nestjs/typeorm';
import { forwardRef, Module } from '@nestjs/common';
import { PatientNotificationPreference } from '../../domain/entities';
import { PatientNotificationPreferenceController } from './patient-notification-preference.controller';
import { PatientNotificationPreferenceService } from './patient-notification-preference.service';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [TypeOrmModule.forFeature([PatientNotificationPreference]), forwardRef(() => AuthModule)],
    controllers: [PatientNotificationPreferenceController],
    providers: [PatientNotificationPreferenceService],
    exports: [PatientNotificationPreferenceService]
})
export class PatientNotificationPreferenceModule { }
