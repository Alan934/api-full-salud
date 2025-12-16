import { Module } from '@nestjs/common';
import { MercadoPagoService } from './mercado_pago.service';
import { MercadoPagoController } from './mercado_pago.controller';
import { PractitionerModule } from '../practitioner/practitioner.module';

@Module({
  controllers: [MercadoPagoController],
  providers: [MercadoPagoService],
  imports:[PractitionerModule]
})
export class MercadoPagoModule {}
