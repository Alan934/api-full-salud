import { forwardRef, Module } from '@nestjs/common';
import { ProvinceService } from './province.service';
import { ProvinceController } from './province.controller';
import { Province } from '../../domain/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Province]), forwardRef(() => AuthModule)],
  controllers: [ProvinceController],
  providers: [ProvinceService],
  exports: [ProvinceService, TypeOrmModule.forFeature([Province])],
})
export class ProvinceModule {}
