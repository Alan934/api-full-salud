import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsBoolean,
  ValidateNested
} from 'class-validator';

export class CreateFamilyGroupDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ 
    example: 'Familia García', 
    description: 'Nombre del grupo familiar', 
    required: false 
  })
  familyGroupName?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ 
    example: 'Familia compuesta por padres e hijos', 
    description: 'Descripción del grupo familiar', 
    required: false 
  })
  familyDescription?: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ 
    example: true, 
    description: 'Indica si el grupo familiar está activo', 
    required: false 
  })
  isActive?: boolean;
}

export class UpdateFamilyGroupDto extends PartialType(CreateFamilyGroupDto) {}

export class FamilyGroupRelationDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ 
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
    description: 'ID del paciente jefe de familia para unirse a un grupo familiar existente',
    required: false 
  })
  headPatientId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateFamilyGroupDto)
  @ApiProperty({ 
    type: CreateFamilyGroupDto,
    description: 'Datos para crear un nuevo grupo familiar siendo este paciente el jefe',
    required: false 
  })
  familyGroup?: CreateFamilyGroupDto;
}