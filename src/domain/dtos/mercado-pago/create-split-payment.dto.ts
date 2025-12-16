import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateSplitPaymentDto {
  @IsString()
  userId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  receiverUserId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;
}
