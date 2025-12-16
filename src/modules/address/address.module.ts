import { forwardRef, Module } from '@nestjs/common';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';
import { Address } from '../../domain/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Address]), forwardRef(() => AuthModule)],
  controllers: [AddressController],
  providers: [AddressService]
})
export class AddressModule {}
