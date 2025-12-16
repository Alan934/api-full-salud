import { forwardRef, Module } from '@nestjs/common';
import { ProcedureService } from './procedure.service';
import { ProcedureController } from './procedure.controller';
import { Procedure } from '../../domain/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Procedure]), forwardRef(() => AuthModule)],
  controllers: [ProcedureController],
  providers: [ProcedureService],
  exports:[ProcedureService, ProcedureModule]
})
export class ProcedureModule {}
