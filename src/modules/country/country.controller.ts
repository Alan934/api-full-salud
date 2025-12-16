import { Controller, Get, Post, Put, Delete, Patch, Param, Body, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { CountryService } from './country.service';
import { CreateCountryDto, UpdateCountryDto, SerializerCountryDto } from '../../domain/dtos';
import { ApiTags,ApiOperation, ApiQuery, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { toDto, toDtoList } from '../../common/util/transform-dto.util';
import { PaginationMetadata } from '../../common/util/pagination-data.util';
import { FilteredCountryDto } from '../../domain/dtos/country/FilteredCountry.dto';
import { PaginationDto } from '../../common/dtos';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { Role } from '../../domain/enums';

@ApiTags('Countries')
@Controller('countries')
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get()
  @ApiOperation({ summary: 'Obtener todos los países paginados', description: 'Obtener todos los países con paginación' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1, description: 'Número de página' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10, description: 'Límite de resultados por página' })
  @ApiResponse({ status: 200, description: 'Países obtenidos', type: SerializerCountryDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findAll(
    @Query() paginationDto: PaginationDto
  ): Promise<{ data: SerializerCountryDto[]; meta: PaginationMetadata }> {
    const { data, meta } = await this.countryService.findAll(paginationDto);
    return { data: toDtoList(SerializerCountryDto, data), meta };
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('include-deletes')
  @ApiOperation({ summary: 'Obtener todos los países incluyendo eliminados', description: 'Obtener todos los países incluyendo eliminados con paginación' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1, description: 'Número de página' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10, description: 'Límite de resultados por página' })
  @ApiResponse({ status: 200, description: 'Países obtenidos', type: SerializerCountryDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findAllIncludeDeletes(
    @Query() paginationDto: PaginationDto
  ): Promise<{ data: SerializerCountryDto[]; meta: PaginationMetadata }> {
    const { data, meta } = await this.countryService.findAllIncludeDeletes(paginationDto);
    return { data: toDtoList(SerializerCountryDto, data), meta };
  }

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('filtered')
  @ApiOperation({ summary: 'Obtener países filtrados y paginados', description: 'Obtener países filtrados y paginados' })
  @ApiQuery({ name: 'name', type: String, required: false, description: 'Nombre del país' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1, description: 'Número de página' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10, description: 'Límite de resultados por página' })
  @ApiResponse({ status: 200, description: 'Países filtrados obtenidos', type: SerializerCountryDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findAllFiltered(
    @Query() query: any
  ): Promise<{ data: SerializerCountryDto[]; meta: PaginationMetadata; msg: string }> {
    const { page = 1, limit = 10, name } = query;
    const filteredDto: FilteredCountryDto = { name, page: Number(page), limit: Number(limit) };
    const paginationDto: PaginationDto = { page: Number(page), limit: Number(limit) };
    const { data, meta, msg } = await this.countryService.findAllFiltered(filteredDto, paginationDto);
    return { data: toDtoList(SerializerCountryDto, data), meta, msg };
  }

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un país por id', description: 'Obtener un país por id' })
  @ApiParam({ name: 'id', description: 'UUID del país', type: String })
  @ApiResponse({ status: 200, description: 'País encontrado', type: SerializerCountryDto })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<SerializerCountryDto> {
    const country = await this.countryService.findOne(id);
    return toDto(SerializerCountryDto, country);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo país', description: 'Crear un nuevo país' })
  @ApiResponse({ status: 201, description: 'País creado', type: SerializerCountryDto })
  @ApiResponse({ status: 400, description: 'Bad request' }) 
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async create(@Body() createDto: CreateCountryDto): Promise<SerializerCountryDto> {
    const country = await this.countryService.create(createDto);
    return toDto(SerializerCountryDto, country);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un país existente', description: 'Actualizar un país existente' })
  @ApiParam({ name: 'id', description: 'UUID del país', type: String })
  @ApiResponse({ status: 200, description: 'País actualizado', type: SerializerCountryDto })
  @ApiResponse({ status: 404, description: 'Country not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateDto: UpdateCountryDto
  ): Promise<SerializerCountryDto> {
    const updated = await this.countryService.update(id, updateDto);
    return toDto(SerializerCountryDto, updated);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un país de forma permanente', description: 'Eliminar un país de forma permanente' })
  @ApiParam({ name: 'id', description: 'UUID del país', type: String })
  @ApiResponse({ status: 200, description: 'País eliminado' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<string> {
    return await this.countryService.remove(id);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch('soft-remove/:id')
  @ApiOperation({ summary: 'Soft delete de un país', description: 'Soft delete de un país' })
  @ApiParam({ name: 'id', description: 'UUID del país', type: String })
  @ApiResponse({ status: 200, description: 'País soft deleted' })
  @ApiResponse({ status: 404, description: 'Country not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async softRemove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<string> {
    return await this.countryService.softRemove(id);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch('restore/:id')
  @ApiOperation({ summary: 'Restaurar un país soft deleted', description: 'Restaurar un país soft deleted' })
  @ApiParam({ name: 'id', description: 'UUID del país', type: String })
  @ApiResponse({ status: 200, description: 'País restaurado', type: SerializerCountryDto })
  @ApiResponse({ status: 404, description: 'Country not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async restore(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ): Promise<SerializerCountryDto> {
    const country = await this.countryService.restore(id);
    return toDto(SerializerCountryDto, country);
  }
}