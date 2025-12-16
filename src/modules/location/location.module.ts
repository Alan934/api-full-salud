import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch, Location } from '../../domain/entities';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Location, Branch]), forwardRef(() => AuthModule)],
  controllers: [LocationController],
  providers: [LocationService]
})
export class LocationModule {}
