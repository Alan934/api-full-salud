import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class SerializerFamilyGroupDto {
  @Expose()
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', description: 'Identificador único del grupo familiar' })
  id: string;

  @Expose()
  @ApiProperty({ 
    example: 'Familia García', 
    description: 'Nombre del grupo familiar', 
    required: false 
  })
  familyGroupName?: string;

  @Expose()
  @ApiProperty({ 
    example: 'Familia compuesta por padres e hijos', 
    description: 'Descripción del grupo familiar', 
    required: false 
  })
  familyDescription?: string;

  @Expose()
  @ApiProperty({ 
    example: true, 
    description: 'Indica si el grupo familiar está activo', 
    required: false 
  })
  isActive?: boolean;

  @Expose()
  @ApiProperty({ 
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
    description: 'ID del paciente cabeza de familia', 
    required: false 
  })
  headPatientId?: string;

  @Expose()
  @ApiProperty({ 
    example: '2024-01-01T00:00:00Z', 
    description: 'Fecha de creación del grupo familiar' 
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({ 
    example: '2024-01-01T00:00:00Z', 
    description: 'Fecha de última actualización del grupo familiar' 
  })
  updatedAt: Date;
}

export class SerializerShortFamilyGroupDto {
  @Expose()
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', description: 'Identificador único del grupo familiar' })
  id: string;

  @Expose()
  @ApiProperty({ 
    example: 'Familia García', 
    description: 'Nombre del grupo familiar', 
    required: false 
  })
  familyGroupName?: string;

  @Expose()
  @ApiProperty({ 
    example: true, 
    description: 'Indica si el grupo familiar está activo', 
    required: false 
  })
  isActive?: boolean;
}