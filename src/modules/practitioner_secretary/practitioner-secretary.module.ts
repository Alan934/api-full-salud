import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location, Practitioner, PractitionerSecretary, Secretary } from '../../domain/entities';
import { PractitionerSecretaryService } from './practitioner-secretary.service';
import { PractitionerSecretaryController } from './practitioner-secretary.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([PractitionerSecretary, Practitioner, Location, Secretary]), forwardRef(() => AuthModule)],
  controllers: [PractitionerSecretaryController],
  providers: [PractitionerSecretaryService]
})
export class PractitionerSecretaryModule {}
