import { ApiProperty, ApiPropertyOptional, OmitType, PartialType, ApiExtraModels, ApiHideProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested, IsOptional, IsString, IsArray } from 'class-validator';
import { ShortBaseDto } from '../../../common/dtos';
import { UserDto } from '../user/user.dto';
import { CreateSocialWorkEnrollmentDto } from '../social-work-enrollment/social-work-enrollment.dto';
import { CreateFamilyGroupDto } from '../family-group/family-group.dto';

@ApiExtraModels(CreateSocialWorkEnrollmentDto, CreateFamilyGroupDto, ShortBaseDto)
export class CreatePatientWithFamilyDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePatientForFamilyDto)
  @ApiHideProperty()
  familyMembers?: CreatePatientForFamilyDto[];
}

export class CreatePatientDto extends OmitType(UserDto, ['role', 'email'] as const) {
  
  @IsOptional()
  @ApiPropertyOptional({ 
    example: 'juan@example.com',
    description: 'Email del paciente. Opcional para miembros de familia.'
  })
  email?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Peréz' })
  emailTutor?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Peréz' })
  phoneTutor?: string;

  // @ValidateNested()
  // @Type(() => ShortBaseDto)
  // @IsOptional()
  // relationship?: ShortBaseDto;

  @ApiPropertyOptional({
    description: 'Id de la obra social',
    oneOf: [{ type: 'string', format: 'uuid' }, /*{ $ref: '#/components/schemas/CreateSocialWorkEnrollmentDto' }*/],
    example: 'clw4s00000000abcdef123' })
  @IsOptional() 
  socialWorkEnrollment?: string | CreateSocialWorkEnrollmentDto; 

  @IsOptional()
  @IsString()
  @ApiProperty({ 
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
    description: 'ID del paciente jefe de familia para unirse a un grupo familiar existente. Si el jefe no tiene grupo, se creará automáticamente uno llamado "Familia <Apellido del jefe>" y se asignará.',
    required: false 
  })
  headPatientId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateFamilyGroupDto)
  @ApiProperty({ 
    type: () => CreateFamilyGroupDto,
    description: 'Datos para crear un nuevo grupo familiar siendo este paciente el jefe',
    required: false 
  })
  familyGroup?: CreateFamilyGroupDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreatePatientWithFamilyDto)
  @ApiHideProperty()
  familyData?: CreatePatientWithFamilyDto;
}

export class CreatePatientForFamilyDto extends OmitType(CreatePatientDto, ['email', 'password', 'username'] as const) {}

export class UpdatePatientDto extends PartialType(CreatePatientDto) {
  @IsOptional()
  @IsString()
  @ApiProperty({ 
    example: '50436717-8608-4bff-bf41-373f14a8b888', 
    description: 'UUID del grupo familiar al que pertenece el paciente. Enviar null para desasociar al paciente del grupo.', 
    required: false 
  })
  familyGroupId?: string;
}

export class UpdatePatientFamilyRelationsDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ 
    example: '50436717-8608-4bff-bf41-373f14a8b888', 
    description: 'UUID del grupo familiar al que asignar el paciente. Enviar null para desasociar al paciente del grupo.', 
    required: false 
  })
  familyGroupId?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ 
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
    description: 'ID del paciente jefe de familia: si no tiene grupo, se creará automáticamente "Familia <Apellido del jefe>" y se asignará al paciente a ese grupo.', 
    required: false 
  })
  headPatientId?: string;
}