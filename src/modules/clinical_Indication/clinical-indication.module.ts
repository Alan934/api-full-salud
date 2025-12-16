import { forwardRef, Module } from '@nestjs/common';
import { ClinicalIndicationController } from './clinical-indication.controller';
import { ClinicalIndicationService } from './clinical-indication.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicalIndication } from '../../domain/entities';
import { AuthModule } from '../auth/auth.module';
import { PrescriptionModule } from '../prescription/prescription.module';
import { PrescriptionService } from '../prescription/prescription.service';
import { ClinicalIndicationDetailModule } from '../clinical_indication_detail/clinical-indication-detail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClinicalIndication]),
    forwardRef(() => AuthModule),
    //forwardRef(() => 
      PrescriptionModule, ClinicalIndicationDetailModule, ClinicalIndicationDetailModule
  //),
  ],
  controllers: [ClinicalIndicationController],
  providers: [ClinicalIndicationService],
  //exports: [ClinicalIndicationService],
})
export class ClinicalIndicationModule {}
