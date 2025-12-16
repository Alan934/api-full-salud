import { forwardRef, Module } from '@nestjs/common';
import { SocialWorkService } from './social-work.service';
import { SocialWorkController } from './social-work.controller';
import { SocialWork } from '../../domain/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([SocialWork]), forwardRef(() => AuthModule)],
  controllers: [SocialWorkController],
  providers: [SocialWorkService],
  exports: [SocialWorkService],
})
export class SocialWorkModule {}
