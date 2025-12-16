import { Module } from '@nestjs/common';
import { ClinicalIndicationDetailService } from './clinical-indication-detail.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicalIndicationDetail } from '../../domain/entities';

@Module({
  imports: [TypeOrmModule.forFeature([ClinicalIndicationDetail])],
  providers: [ClinicalIndicationDetailService],
  exports:[ClinicalIndicationDetailService, TypeOrmModule.forFeature([ClinicalIndicationDetail])],
})
export class ClinicalIndicationDetailModule {}
