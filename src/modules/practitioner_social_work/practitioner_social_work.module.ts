import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PractitionerSocialWorkService } from './practitioner_social_work.service';
import { PractitionerSocialWorkController } from './practitioner_social_work.controller';
import { PractitionerSocialWork, Practitioner, SocialWork } from '../../domain/entities';
import { AuthModule } from '../auth/auth.module'; // Para AuthGuard y RolesGuard

@Module({
  imports: [
    TypeOrmModule.forFeature([PractitionerSocialWork, Practitioner, SocialWork]),
    forwardRef(() => AuthModule),
  ],
  controllers: [PractitionerSocialWorkController],
  providers: [PractitionerSocialWorkService],
  exports: [PractitionerSocialWorkService],
})
export class PractitionerSocialWorkModule {}