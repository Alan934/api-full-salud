import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

export class ResetPasswordDto {
  @IsStrongPassword()
  @IsNotEmpty()
  password: string;
}
