import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from '../../domain/entities';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';
import { AuthModule } from '../auth/auth.module';
import { ProvinceModule } from '../province/province.module';

@Module({
  imports: [TypeOrmModule.forFeature([Department]), 
  forwardRef(() => AuthModule),
  ProvinceModule],
  controllers: [DepartmentController],
  providers: [DepartmentService]
})
export class DepartmentModule {}
