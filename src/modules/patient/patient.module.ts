import { forwardRef, Module } from '@nestjs/common';
import { PatientService } from './patient.service';
import { PatientController } from './patient.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  FamilyGroup,
  Patient,
  Practitioner,
  SocialWork,
  SocialWorkEnrollment,
  User
} from '../../domain/entities';
import { AuthModule } from '../auth/auth.module';
import { MailService } from '../mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import { FamilyGroupModule } from '../family_group/family-group.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Patient,
      Practitioner,
      SocialWorkEnrollment,
      SocialWork,
      User,
      FamilyGroup
    ]),
    forwardRef(() => AuthModule),
    FamilyGroupModule
  ],
  controllers: [PatientController],
  providers: [PatientService, MailService, JwtService],
  exports: [PatientService]
})
export class PatientModule {}
