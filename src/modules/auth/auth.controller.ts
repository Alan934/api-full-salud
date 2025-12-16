/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthUserDto, UserDto, ResetPasswordDto } from '../../domain/dtos';
import { ChangePasswordDto } from '../../domain/dtos/password/chance-password';
import { AuthGuard, Roles, RolesGuard } from './guards/auth.guard';
import { AuthGuard as GAuthGuard } from '@nestjs/passport';
import { Role } from '../../domain/enums';
import { FileInterceptor } from '@nestjs/platform-express';
import { User, Token } from './decorators';
import { CurrentUser } from './interfaces/current-user.interface';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Endpoint para login
  @Post('/login')
  @ApiOperation({ summary: 'Iniciar sesión de usuario' })
  @ApiBody({ type: AuthUserDto })
  @ApiResponse({
    status: 200,
    description: 'Inicio de sesión exitoso',
    type: UserDto
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async loginUser(
    @Body() loginDto: AuthUserDto
  ) /*: Promise<UserDto & { accessToken: string; refreshToken: string }>*/ {
    return await this.authService.loginUser(loginDto);
  }

  // Endpoints para autenticación con Google
  @Get('google/signin')
  @UseGuards(GAuthGuard('google'))
  @ApiOperation({ summary: 'Iniciar sesión con Google' })
  @ApiResponse({
    status: 200,
    description: 'Inicio de sesión exitoso con Google',
    type: UserDto
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async googleSignIn(@Req() req) {}

  @Get('google/signin/callback')
  @ApiOperation({ summary: 'Callback de Google' })
  @ApiResponse({
    status: 200,
    description: 'Inicio de sesión exitoso con Google',
    type: UserDto
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @UseGuards(GAuthGuard('google'))
  async googleSignInCallback(@Req() req) {
    return this.authService.googleSignIn(req);
  }

  // Endpoint para verificar token y generar RefreshToken
  @UseGuards(AuthGuard)
  @Post('verify')
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Verificar token y generar RefreshToken' })
  @ApiResponse({ status: 401, description: 'Token inválido' })
  verifyToken(@User() user: CurrentUser, @Token() token: string) {
    return this.authService.generateRefreshToken(token);
  }

  // Endpoint para cambiar contraseña
  @Patch('change-password')
  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Cambiar contraseña' })
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(
    @User() user: CurrentUser,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return await this.authService.changePassword(user.id, changePasswordDto);
  }

  @Post('forgot-password')
  @ApiQuery({ name: 'email', type: 'string' })
  async forgotPassword(@Query('email') email: string) {
    return await this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Token() token: string
  ) {
    return await this.authService.resetPassword(resetPasswordDto, token);
  }

  @Patch('verify-email')
  @ApiOperation({ summary: 'Verificar token para activar un User' })
  async verifyEmail(@Query('token') token: string) {
    return await this.authService.verifyEmail(token);
  }

  // Endpoint para subir imágenes
  @Post('upload')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Subir imagen de perfil' })
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File
  ): Promise<{ url: string }> {
    const url = await this.authService.uploadImage(file);
    return { url };
  }

  //test endpoint
  @Get('/getUserById')
  async getUserById(@Query('id') id: string) {
    return await this.authService.getUserById(id);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('reset-password-direct')
  @ApiOperation({ summary: 'Restablecer contraseña directamente' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          example: 'usuario@ejemplo.com',
          description: 'Correo electrónico del usuario'
        },
        newPassword: {
          type: 'string',
          example: 'NuevaContraseña123!',
          description:
            'Nueva contraseña que cumple con los requisitos de seguridad'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña restablecida exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Contraseña actualizada correctamente'
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async resetPasswordDirect(
    @Body() data: { email: string; newPassword: string }
  ) {
    return await this.authService.resetPasswordDirect(
      data.email,
      data.newPassword
    );
  }
}
