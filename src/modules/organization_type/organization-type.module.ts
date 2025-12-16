import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationType } from '../../domain/entities';
import { OrganizationTypeController } from './organization-type.controller';
import { OrganizationTypeService } from './organization-type.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationType]), forwardRef(() => AuthModule)],
  controllers: [OrganizationTypeController],
  providers: [OrganizationTypeService],
  exports: [OrganizationTypeService]
})
export class OrganizationTypeModule {}
