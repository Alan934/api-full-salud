import { forwardRef, Module } from '@nestjs/common';
import { PractitionerRoleService } from './practitioner-role.service';
import { PractitionerRoleController } from './practitioner-role.controller';
import { PractitionerRole } from '../../domain/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([PractitionerRole]), forwardRef(() => AuthModule)],
  controllers: [PractitionerRoleController],
  providers: [PractitionerRoleService],
  exports: [PractitionerRoleService]
})
export class PractitionerRoleModule { }
