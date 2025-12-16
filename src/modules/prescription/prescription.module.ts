import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prescription } from '../../domain/entities';
import { PrescriptionService } from './prescription.service';
import { PrescriptionController } from './prescription.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Prescription]), AuthModule],
    controllers: [PrescriptionController],
    providers: [PrescriptionService],
    exports: [PrescriptionService],
})
export class PrescriptionModule { }