import { Controller, Get, Res, Param, Post, HttpCode, HttpException, HttpStatus, Query } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('bot')
export class WhatsAppController {
  constructor(private whatsAppService: WhatsAppService) {}

  @Get('qrcode')
  @ApiOperation({ summary: 'Obtener el código QR para iniciar sesión en WhatsApp' })
  @ApiResponse({ status: 200, description: 'Código QR obtenido exitosamente', type: String })
  @ApiResponse({ status: 500, description: 'Error al obtener el código QR' })
  async getQRCode(@Res() res) {
    const qrCode = await this.whatsAppService.getQRCode();
    if (qrCode) {
      res.setHeader('Content-Type', qrCode.contentType);
      res.send(qrCode.buffer);
    } else {
      res.status(500).send('Error fetching QR code image');
    }
  }

  @Post('send-message')
  @ApiOperation({ summary: 'Enviar un mensaje a un número de teléfono' })
  @ApiResponse({ status: 200, description: 'Mensaje enviado exitosamente' })
  @ApiResponse({ status: 400, description: 'Error al enviar el mensaje' })
  @HttpCode(HttpStatus.OK) // Set default success status to 200 OK for POST
  async sendMessage(
    @Query('to') to: string,
    @Query('message') message: string,
  ) {
    // Basic validation
    if (!to || !message) {
      throw new HttpException('Missing required query parameters: "to" and "message"', HttpStatus.BAD_REQUEST);
    }

    try {
      await this.whatsAppService.sendMessage(to, message);
      // Return a success response if the service call doesn't throw
      return { success: true, message: 'Message send request processed.' };
    } catch (error) {
      // Catch errors from the service (e.g., external POST failed, WhatsApp send failed)
      throw new HttpException(
        (error as Error).message || 'Failed to send message',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('disconnect')
  @ApiOperation({ summary: 'Desconectar la sesión de WhatsApp' })
  @ApiResponse({ status: 200, description: 'Desconexión exitosa' })
  @ApiResponse({ status: 500, description: 'Error al desconectar' })
  @HttpCode(HttpStatus.OK) // Set default success status to 200 OK
  async disconnect() {
    try {
      await this.whatsAppService.disconnect();
      return { success: true, message: 'Disconnect request processed.' };
    } catch (error) {
      // Catch errors from the service
      throw new HttpException(
        (error as Error).message || 'Failed to process disconnect request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
