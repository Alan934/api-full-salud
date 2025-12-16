import { forwardRef, Module } from '@nestjs/common';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '../../domain/entities';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Branch]), forwardRef(() => AuthModule)],
  providers: [BranchService],
  controllers: [BranchController],
  exports: [BranchService]
})
export class BranchModule {}
