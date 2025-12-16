import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Contraseña actual del usuario',
    example: 'ClaveActual1*'
  })
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description: 'Nueva contraseña para el usuario',
    example: 'NuevaMaria1234!'
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8, {
    message: 'La nueva contraseña debe tener al menos 8 caracteres'
  })
  newPassword: string;

  @ApiProperty({
    description: 'Confirmación de la nueva contraseña',
    example: 'NuevaMaria1234!'
  })
  @IsNotEmpty()
  @IsString()
  confirmNewPassword: string;
}
