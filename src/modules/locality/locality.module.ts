import { forwardRef, Module } from '@nestjs/common';
import { LocalityService } from './locality.service';
import { LocalityController } from './locality.controller';
import { Locality } from '../../domain/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Locality]), forwardRef(() => AuthModule)],
  controllers: [LocalityController],
  providers: [LocalityService]
})
export class LocalityModule {}
