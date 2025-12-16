import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamilyGroup, Patient, SocialWorkEnrollment, SocialWork } from '../../domain/entities';
import { FamilyGroupService } from './family-group.service';
import { AuthModule } from '../auth/auth.module';
import { FamilyGroupController } from './family-group.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([FamilyGroup, Patient, SocialWorkEnrollment, SocialWork]),
    forwardRef(() => AuthModule)
  ],
  controllers: [FamilyGroupController],
  providers: [FamilyGroupService],
  exports: [FamilyGroupService]
})
export class FamilyGroupModule {}