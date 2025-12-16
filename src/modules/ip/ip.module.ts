import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ip } from '../../domain/entities/ip.entity';
import { IpService } from './ip.service';
import { IpController } from './ip.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Ip]), forwardRef(() => AuthModule)],
  controllers: [IpController],
  providers: [IpService],
  exports: [IpService]
})
export class IpModule {}