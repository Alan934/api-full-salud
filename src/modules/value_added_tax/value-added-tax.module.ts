import { forwardRef, Module } from '@nestjs/common';
import { ValueAddedTaxService } from './value-added-tax.service';
import { ValueAddedTaxController } from './value-added-tax.controller';
import { ValueAddedTax  } from '../../domain/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([ValueAddedTax ]), forwardRef(() => AuthModule)],
  controllers: [ValueAddedTaxController],
  providers: [ValueAddedTaxService]
})
export class ValueAddedTaxModule {}
