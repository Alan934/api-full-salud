import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient, Practitioner, PractitionerRole, User } from '../../domain/entities';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { envConfig } from '../../config/envs';
import { GoogleStrategy } from './config/google.strategy';
import { JwtAuthGuard, RolesGuard } from './guards/auth.guard';
import { Reflector } from '@nestjs/core';
import { MailService } from '../mail/mail.service';
import { PractitionerService } from '../practitioner/practitioner.service';
import { PractitionerModule } from '../practitioner/practitioner.module';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: envConfig.JWT_SECRET,
      signOptions: { expiresIn: '15m' }
    }),
    TypeOrmModule.forFeature([User, Practitioner, Patient]),
    PractitionerModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    JwtAuthGuard,
    RolesGuard,
    Reflector,
    MailService
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard]
})
export class AuthModule {}
