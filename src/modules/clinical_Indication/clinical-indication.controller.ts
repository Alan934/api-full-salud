import { Body, Controller, Get, Post, Param, Patch, Query, UseGuards, ParseArrayPipe, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CreateClinicalIndicationDto,
  SerializerClinicalIndicationDto,
  UpdateClinicalIndicationDto
} from '../../domain/dtos';
import { ClinicalIndicationService } from './clinical-indication.service';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { Role } from '../../domain/enums';
import { toDto, toDtoList } from '../../common/util/transform-dto.util';
import { ApiPaginationResponse } from '../../common/swagger/api-pagination-response';
import { clinicalIndicationFilteredPaganited } from '../../domain/dtos/clinical-indication/clinical-indication-filtered-pagination.dtp';

@ApiTags('ClinicalIndication')
@Controller('clinical-indication')
export class ClinicalIndicationController {
  constructor(
    private readonly service: ClinicalIndicationService,
    // @Inject(forwardRef(() => PrescriptionService)) // Usa forwardRef aquí
    // private readonly prescriptionService: PrescriptionService,
  ) {}

  @Post()
  @Roles(Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Create a new clinical indication' })
  @ApiResponse({
    status: 201,
    description: 'The created charge item ',
    type: SerializerClinicalIndicationDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Clinical indication not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async create(@Body() createDto: CreateClinicalIndicationDto): Promise<SerializerClinicalIndicationDto> {
    const entity = await this.service.create(createDto);
    return toDto(SerializerClinicalIndicationDto, entity);
  }

  @Get()
  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.SECRETARY)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Get all Clinical indications with optional filtering and pagination',
    description: 'Retrieve a list of Clinical indications, filtered by criteria like price, practitioner, or procedure, and supports pagination.',
  })
  @ApiPaginationResponse(SerializerClinicalIndicationDto)
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'start', required: false, type: String, description: 'Filter by price' })
  @ApiQuery({ name: 'presctiptionId', required: false, type: String, description: 'Filter by Prescrption ID' })
  @ApiResponse({ status: 200, description: 'Paginated list of practitionerRoles retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @ApiQuery({ 
  name: 'indicationDetails', 
  required: false, 
  type: [String], 
  description: 'Filter by indication details (comma-separated)',
  isArray: true 
})async findAllPaginated(
    @Query() filterPaginationDto: clinicalIndicationFilteredPaganited,
    @Param('indicationDetails', new ParseArrayPipe({
      items: String,
      separator: ',',
      optional: true,
      errorHttpStatusCode: HttpStatus.BAD_REQUEST
    }))indicationDetails?: string[],
  ): Promise<{ data: SerializerClinicalIndicationDto[]; lastPage: number; total: number; msg?: string }> {
    filterPaginationDto.indicationsDetails = indicationDetails;
    const { data, lastPage, total, msg } = await this.service.getAll(filterPaginationDto);
    const serializedData = toDtoList(SerializerClinicalIndicationDto, data);
    return { data: serializedData, total, lastPage, msg };
  }

    @Roles(Role.PRACTITIONER, Role.ADMIN)
    @UseGuards(AuthGuard, RolesGuard)
    @ApiBearerAuth('bearerAuth')
    @Get(':id')
    @ApiOperation({ summary: 'Get a specific Clinical Indication by ID' })
    @ApiParam({ name: 'id', description: 'Clinical Indication  ID' })
    @ApiResponse({ 
      status: 200, 
      description: 'The requested Clinical Indication',
      type: SerializerClinicalIndicationDto
    })
    @ApiResponse({ status: 404, description: 'Charge Item not found' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 403, description: 'Forbidden resource' })
    async getOne(@Param('id') id: string): Promise<SerializerClinicalIndicationDto> {
      const entity = await this.service.getOne(id);
      return toDto(SerializerClinicalIndicationDto, entity);
    }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Update an existing Clinical indication' })
  @ApiParam({ name: 'id', description: 'ID of the charge item to update' })
  @ApiResponse({
    status: 200,
    description: 'The updated charge item',
    type: SerializerClinicalIndicationDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Clinical indication not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateClinicalIndicationDto,
  ): Promise<SerializerClinicalIndicationDto> {
    const entity = await this.service.update(id, updateDto);
    return toDto(SerializerClinicalIndicationDto, entity);
  }

  @Patch('soft-delete/:id')
  @Roles(Role.ADMIN, Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Soft delete a clinical indication' })
  @ApiParam({ name: 'id', description: 'ID of the clinical indication to soft delete' })
  @ApiResponse({
    status: 200,
    description: 'Message confirming soft deletion',
    schema: { example: { message: 'Clinical indication with ID "..." soft deleted successfully' } },
  })
  @ApiResponse({ status: 404, description: 'Clinical indication not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async softDelete(@Param('id') id: string): Promise<{ message: string }> {
    return this.service.softDeleted(id);
  }

  @Patch('recover/:id')
  @Roles(Role.ADMIN, Role.PRACTITIONER)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Recover a clinical indication' })
  @ApiParam({ name: 'id', description: 'ID of the clinical indication to recover' })
  @ApiResponse({
    status: 200,
    description: 'Message confirming recovery',
    schema: { example: { message: 'Clinical indication with ID "..." recovered successfully' } },
  })
  @ApiResponse({ status: 404, description: 'Charge item not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async recover(@Param('id') id: string): Promise<SerializerClinicalIndicationDto> {
    const entity = await this.service.restore(id);
    return toDto(SerializerClinicalIndicationDto, entity)
  }

}
