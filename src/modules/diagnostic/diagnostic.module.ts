import { forwardRef, Module } from '@nestjs/common';
import { DiagnosticService } from './diagnostic.service';
import { DiagnosticController } from './diagnostic.controller';
import { Diagnostic } from '../../domain/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Diagnostic]), forwardRef(() => AuthModule)],
  controllers: [DiagnosticController],
  providers: [DiagnosticService]
})
export class DiagnosticModule {}
