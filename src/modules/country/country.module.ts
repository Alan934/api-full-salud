import { forwardRef, Module } from '@nestjs/common';
import { CountryService } from './country.service';
import { CountryController } from './country.controller';
import { Country } from '../../domain/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Country]), forwardRef(() => AuthModule)],
  controllers: [CountryController],
  providers: [CountryService]
})
export class CountryModule {}
