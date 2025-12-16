import { forwardRef, Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { Organization } from '../../domain/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchModule } from '../branch/branch.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization]),
    BranchModule, forwardRef(() => AuthModule)
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService]
})
export class OrganizationModule {}
