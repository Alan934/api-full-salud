import { forwardRef, Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PdfController } from './pdf.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicationRequest } from '../../domain/entities/medication-request.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports:[TypeOrmModule.forFeature([MedicationRequest]),
  forwardRef(() => AuthModule)],
  controllers: [PdfController],
  providers: [PdfService, ],
})
export class PdfModule {}
