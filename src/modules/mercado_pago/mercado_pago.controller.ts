import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Redirect,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MercadoPagoService } from './mercado_pago.service';
import { CreateSplitPaymentDto } from '../../domain/dtos/mercado-pago/create-split-payment.dto';

@ApiTags('Mercado Pago')
@Controller('mp')
export class MercadoPagoController {
  constructor(private readonly mercadoPagoService: MercadoPagoService) { }

  @Get('auth/login')
  @Redirect()
  @ApiOperation({ summary: 'Iniciar autorización OAuth con Mercado Pago' })
  @ApiResponse({ status: 302, description: 'Redirección al login de Mercado Pago' })
  login() {
    const url = this.mercadoPagoService.getAuthUrl();
    return { url };
  }

  @Get('auth/callback')
  @ApiOperation({ summary: 'Callback de OAuth - Guardar tokens del usuario' })
  @ApiQuery({ name: 'code', required: true, description: 'Código devuelto por Mercado Pago' })
  @ApiResponse({ status: 302, description: 'Redirección con resultado del proceso' })
  async callback(@Query('code') code: string) {
    if (!code) {
      throw new NotFoundException('Authorization code is required');
    }
    const result = await this.mercadoPagoService.HandleCallback(code);
    return {
      url: `/?success=true&user_id=${result.user_id}&scope=${encodeURIComponent(result.scope)}`,
      statusCode: HttpStatus.FOUND,
    };
  }

  @Get('token/:userId')
  @ApiOperation({ summary: 'Obtener info del token de un usuario' })
  @ApiResponse({ status: 200, description: 'Información del token' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado o sin token' })
  async getTokenInfo(@Param('userId') userId: string) {
    const info = await this.mercadoPagoService.getTokenInfo(userId);
    if (!info) {
      throw new NotFoundException('User not found or token missing');
    }
    return info;
  }

  @Post('payments/create-split')
  @ApiOperation({ summary: 'Crear un pago con split de comisión' })
  @ApiResponse({ status: 201, description: 'Preferencia creada y link de pago generado' })
  @ApiBody({ type: CreateSplitPaymentDto })
  async createSplitPayment(@Body() body: CreateSplitPaymentDto) {
    return await this.mercadoPagoService.createSplitPayment(body);
  }

  @Get('payments/status/:paymentId')
  @ApiOperation({ summary: 'Consultar el estado de un pago' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'Estado actual del pago' })
  @ApiResponse({ status: 404, description: 'Usuario no autenticado o no encontrado' })
  async getPaymentStatus(
    @Param('paymentId') paymentId: string,
    @Query('userId') userId: string,
  ) {
    return await this.mercadoPagoService.getPaymentStatus(paymentId, userId);
  }

  @Post('payments/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook de Mercado Pago para notificaciones de pago' })
  @ApiResponse({ status: 200, description: 'Notificación recibida correctamente' })
  webhook(@Body() body: any) {
    console.log('🔔 Webhook recibido:', body);
    return { received: true };
  }

  @Delete('auth/disconnect/:userId')
  @ApiOperation({ summary: 'Desvincular cuenta de Mercado Pago' })
  @ApiResponse({ status: 200, description: 'Cuenta desvinculada correctamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async disconnect(@Param('userId') userId: string) {
    return await this.mercadoPagoService.disconnectAccount(userId);
  }
}
