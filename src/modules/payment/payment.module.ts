import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment, PractitionerRole, SocialWork } from '../../domain/entities';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, PractitionerRole, SocialWork]), forwardRef(() => AuthModule)],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
