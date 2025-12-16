import { forwardRef, Module } from '@nestjs/common';
import { PractitionerService } from './practitioner.service';
import { PractitionerController } from './practitioner.controller';
import {
  ProfessionalDegree,
  Location,
  Patient,
  Practitioner,
  AppointmentSlot,
  PractitionerRole,
  User,
  AppointmentSlotSchedule
} from '../../domain/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { HttpModule } from '@nestjs/axios';
import { MailService } from '../mail/mail.service';
import { PractitionerSocialWork } from '../../domain/entities/practitioner-social-work.entity';
import { PractitionerCleanUpService } from '../../config/practitionerCleanUpService';
import { PendingSocialWorkDetail } from '../../domain/entities/pending_social_work_detail.entity';
import { AppointmentSlotService } from '../appointment_slot/appointment-slot.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Practitioner,
      AppointmentSlot,
      PractitionerSocialWork,
      PractitionerRole,
      ProfessionalDegree,
      Patient,
      Location,
      User,
      PendingSocialWorkDetail,
      AppointmentSlotSchedule
    ]),
    HttpModule,
    forwardRef(() => AuthModule)
  ],
  controllers: [PractitionerController],
  providers: [PractitionerService, MailService, PractitionerCleanUpService, AppointmentSlotService],
  exports: [PractitionerService, TypeOrmModule]
})
export class PractitionerModule {}
