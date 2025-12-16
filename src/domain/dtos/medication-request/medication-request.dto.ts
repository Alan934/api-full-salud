import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, ValidateNested, IsEmail, IsEnum, IsDateString } from 'class-validator';
import { DocumentType } from '../../enums';

// DTO específico para pacientes en el contexto de medication requests
export class CreatePatientForMedicationRequestDto {
  @IsOptional()
  @IsEnum(DocumentType)
  @ApiProperty({ examples: [DocumentType.DNI, DocumentType.PASSPORT] })
  documentType?: DocumentType;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: '12345678' })
  dni: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Juan' })
  name: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Pérez' })
  lastName: string;

  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({ example: 'juan.perez@gmail.com' })
  email: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: '123456789' })
  phone: string;
}

export class CreateMedicationRequestDto {

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({ example: '2025-10-21' })
  issueDate: Date;

  @IsDateString()
  @IsNotEmpty()
  @ApiProperty({ example: '2025-11-21' })
  expirationDate: Date;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Infección respiratoria.' })
  diagnosis: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Controlar evolución a los 7 días' })
  observations?: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Amoxicilina' })
  medication: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '500 mg cápsulas' })
  presentation?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '1 cada 8 horas' })
  dosis?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '7 días' })
  duration?: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  practitionerId: string; 

  @IsOptional()
  @IsString()
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  patientId?: string; 
  
  @IsString()
  @IsOptional()
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
  appointmentId?: string;


  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePatientForMedicationRequestDto)
  @ApiProperty({
    example: {
      documentType: 'dni',
      dni: '12345678',
      name: 'Juan',
      lastName: 'Pérez',
      email: 'juan.perez@gmail.com',
      phone: '123456789',
    },
  })
  patient?: CreatePatientForMedicationRequestDto;

}

export class UpdateMedicationRequestDto extends PartialType(CreateMedicationRequestDto) {}
