import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialTransaction } from '../../domain/entities';
import { FinancialTransactionController } from './financial-transaction.controller';
import { FinancialTransactionService } from './financial-transaction.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialTransaction]), forwardRef(() => AuthModule)],
  controllers: [FinancialTransactionController],
  providers: [FinancialTransactionService]
})
export class FinancialTransactionModule {}
