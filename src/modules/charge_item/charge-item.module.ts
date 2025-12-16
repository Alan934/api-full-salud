import { forwardRef, Module } from '@nestjs/common';
import { ChargeItemService } from './charge-item.service';
import { ChargeItemController } from './charge-item.controller';
import { ChargeItem } from '../../domain/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PractitionerModule } from '../practitioner/practitioner.module';
import { ProcedureModule } from '../procedure/procedure.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChargeItem]), 
    forwardRef(() => AuthModule),
    PractitionerModule, ProcedureModule],
  controllers: [ChargeItemController],
  providers: [ChargeItemService]
})
export class ChargeItemModule {}
