import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { PractitionerService } from './practitioner.service';
import { CreatePractitionerDto, PractitionerByNameAndLicenseDto, UpdatePractitionerDto, ValidatePractitionerSisaDto } from '../../domain/dtos/practitioner/practitioner.dto';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { modePractitioner } from '../../domain/enums/mode-practitioner.enum';
import { ApiPaginationResponse } from '../../common/swagger/api-pagination-response';
import { toDto, toDtoList } from '../../common/util/transform-dto.util';
import { PaginationMetadata } from '../../common/util/pagination-data.util';
import { plainToClass } from 'class-transformer';
import { SerializerPractitionerDto } from '../../domain/dtos/practitioner/practitioner-serializer.dto';
import { PractitionerFilteredPaginationDto } from '../../domain/dtos/practitioner/practitioner-filtered-pagination.dto';
import { SerializerShortPractitionerRoleDto } from '../../domain/dtos';
import { Role } from '../../domain/enums';
import { PaginationDto } from '../../common/dtos';
import { OptimizePractitionerDto, thirdOptimizePractitionerDto } from '../../domain/dtos/practitioner/practitioner-optimize-serializer';
import { SisaPractitionerResponse } from '../../domain/interface/sisa-response.interface';

@ApiTags('Practitioner')
@Controller('practitioner')
export class PractitionerController {
  constructor(protected service: PractitionerService) { }

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo especialista' })
  @ApiResponse({ status: 201, description: 'Especialista creado exitosamente', type: SerializerPractitionerDto })
  @ApiResponse({ status: 400, description: 'Error al crear el especialista' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async create(@Body() createSpecialistDto: CreatePractitionerDto) {
    return await this.service.createSpecialist(createSpecialistDto);
  }

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('paginated')
  @ApiOperation({ summary: 'Obtener todos los profesionales paginados' })
  @ApiPaginationResponse(SerializerPractitionerDto)
  @ApiResponse({ status: 200, description: 'Profesionales obtenidos', type: SerializerPractitionerDto, isArray: true })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  async findAllPaginated(
    @Query() paginationDto: PaginationDto
  ): Promise<{ data: SerializerPractitionerDto[]; meta: PaginationMetadata }> {
    return await this.service.findAllPaginated(paginationDto);
  }

  @Get('sisa-data/:dni')
  @ApiOperation({ summary: 'Get practitioner data from SISA' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns practitioner data from SISA',
    schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        apellido: { type: 'string' },
        tipoDocumento: { type: 'string' },
        numeroDocumento: { type: 'string' },
        cuit: { type: 'string' },
        matriculasHabilitadas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              matricula: { type: 'string' },
              provincia: { type: 'string' },
              profesion: { type: 'string' },
              estado: { type: 'string' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid DNI or SISA error' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getSisaData(@Param('dni') dni: string): Promise<SisaPractitionerResponse> {
    return await this.service.getPractitionerSisaData(dni);
  }

  @Post('validate-sisa')
  @ApiOperation({ summary: 'Validar un profesional en el sistema SISA' })
  @ApiResponse({ 
    status: 200, 
    description: 'Devuelve si el profesional es válido según SISA',
    schema: {
      type: 'object',
      properties: {
        isValid: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Error en la validación' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async validateInSisa(@Body() validateDto: ValidatePractitionerSisaDto): Promise<{ isValid: boolean, message: string }> {
    try {
      const sisaResponse = await this.service.validatePractitionerInSisa(validateDto.dni, validateDto.license);
      return { 
        isValid: sisaResponse.isValid, 
        message: sisaResponse.professionalInfo 
          ? `Professional ${sisaResponse.professionalInfo.name} ${sisaResponse.professionalInfo.lastName} is valid in SISA` 
          : 'Professional is valid in SISA'
      };
    } catch (error) {
      return {
        isValid: false,
        message: 'Error validating professional in SISA: ' + error,
      };
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a practitioner by ID' })
  @ApiResponse({ status: 200, description: 'Especialista obtenido exitosamente', type: OptimizePractitionerDto })
  @ApiResponse({ status: 404, description: 'Especialista no encontrado' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getOne(@Param('id') id: string): Promise<OptimizePractitionerDto> {
    const practitioner = await this.service.getOne(id);
    return toDto(OptimizePractitionerDto, practitioner);
  }

  @Get('search/by-name-license')
  @ApiOperation({ 
    description: 'Buscar médicos por nombre y/o matrícula',
    summary: 'Permite buscar médicos combinando nombre (parcial) y matrícula (exacta)'
  })
  @ApiResponse({ status: 200, description: 'Especialista obtenido exitosamente', type: OptimizePractitionerDto })
  @ApiResponse({ status: 404, description: 'Especialista no encontrado' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findByNameAndLicense(
    @Query() filterDto: PractitionerByNameAndLicenseDto
  ): Promise<OptimizePractitionerDto> {
    const practitioner = await this.service.findByNameAndLicense(filterDto);
    return toDto(OptimizePractitionerDto, practitioner);
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a practitioner' })
  @ApiResponse({ status: 200, description: 'Especialista actualizado exitosamente', type: SerializerPractitionerDto })
  @ApiResponse({ status: 404, description: 'Especialista no encontrado' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async update(
    @Param('id') id: string,
    @Body() updateSpecialistDto: UpdatePractitionerDto,
  ): Promise<SerializerPractitionerDto> {
    const practitioner = await this.service.update(id, updateSpecialistDto);
    return plainToClass(SerializerPractitionerDto, practitioner);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch('soft-delete/:id')
  @ApiOperation({ summary: 'Eliminar un practitioner (soft delete)' })
  @ApiResponse({ status: 200, description: 'Especialista eliminado exitosamente', type: SerializerPractitionerDto })
  @ApiResponse({ status: 404, description: 'Especialista no encontrado' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async softDelete(@Param('id') id: string): Promise<{ message: string }> {
    return this.service.softDelete(id);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch('recover/:id')
  @ApiOperation({ summary: 'Recuperar un practitioner eliminado' })
  @ApiResponse({ status: 200, description: 'Especialista recuperado exitosamente', type: SerializerPractitionerDto })
  @ApiResponse({ status: 404, description: 'Especialista no encontrado' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async recover(@Param('id') id: string): Promise<{ message: string }> {
    return this.service.recover(id);
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT, Role.SECRETARY)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('search/all')
  @ApiOperation({
    summary: 'Búsqueda avanzada de profesionales',
    description: 'Obtiene todos los profesionales con filtros avanzados y paginación'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de profesionales filtrada',
    type: SerializerPractitionerDto,
    isArray: true 
  })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async practitionerPaginationAll(
    @Query() filters: PractitionerFilteredPaginationDto
  ) {
    const result = await this.service.practitionerPaginationAll(filters);
    return {
      ...result,
      data: toDtoList(SerializerPractitionerDto, result.data)
    };
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN,Role.PATIENT, Role.SECRETARY)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('with-turns')
  @ApiOperation({
    summary: 'Get all practitioner with their turns'
  })
  @ApiResponse({ status: 200, description: 'Profesionales obtenidos', type: SerializerPractitionerDto, isArray: true })
  @ApiResponse({ status: 404, description: 'Profesionales no encontrados' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findAllWithTurns(): Promise<SerializerPractitionerDto[]> {
    const specialists = await this.service.findAllWithTurns();
    return toDtoList(SerializerPractitionerDto, specialists);
  }

}
