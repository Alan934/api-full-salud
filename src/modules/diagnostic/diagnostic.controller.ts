import { Controller, Get, Post, Put, Delete, Patch, Param, Body, ParseUUIDPipe, UseGuards, Query } from '@nestjs/common';
import { DiagnosticService } from './diagnostic.service';
import { Diagnostic } from '../../domain/entities';
import { CreateDiagnosticDto, UpdateDiagnosticDto, SerializerDiagnosticDto } from '../../domain/dtos';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { toDto } from '../../common/util/transform-dto.util';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { Role } from '../../domain/enums';
import { PaginationDto } from '../../common/dtos';
import { PaginationMetadata } from '../../common/util/pagination-data.util';
@ApiTags('Diagnostic')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard, RolesGuard)
@Controller('diagnostic')
export class DiagnosticController {
  constructor(private readonly diagnosticService: DiagnosticService) {}

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get()
  @ApiOperation({ summary: 'Obtener todos los diagnósticos', description: 'Obtener todos los diagnósticos' })
  @ApiResponse({ status: 200, description: 'Diagnósticos obtenidos', type: SerializerDiagnosticDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findAll(): Promise<SerializerDiagnosticDto[]> {
    const diagnostics = await this.diagnosticService.findAll();
    return diagnostics.map(d => toDto(SerializerDiagnosticDto, d));
  }

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('paginated')
  @ApiOperation({ summary: 'Obtener todos los diagnósticos paginados', description: 'Obtener todos los diagnósticos paginados' })
  @ApiResponse({ status: 200, description: 'Diagnósticos obtenidos', type: SerializerDiagnosticDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findAllPaginated(
    @Query() paginationDto: PaginationDto
  ): Promise<{ data: SerializerDiagnosticDto[]; meta: PaginationMetadata }> {
    return await this.diagnosticService.findAllPaginated(paginationDto);
  }

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un diagnóstico por id', description: 'Obtener un diagnóstico por id' })
  @ApiParam({ name: 'id', description: 'UUID del diagnóstico', type: String })
  @ApiResponse({ status: 200, description: 'Diagnóstico encontrado', type: SerializerDiagnosticDto })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<SerializerDiagnosticDto> {
    const diagnostic = await this.diagnosticService.findOne(id);
    return toDto(SerializerDiagnosticDto, diagnostic);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo diagnóstico', description: 'Crear un nuevo diagnóstico' })
  @ApiResponse({ status: 201, description: 'Diagnóstico creado', type: SerializerDiagnosticDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async create(@Body() createDiagnosticDto: CreateDiagnosticDto): Promise<SerializerDiagnosticDto> {
    const diagnostic = await this.diagnosticService.create(createDiagnosticDto);
    return toDto(SerializerDiagnosticDto, diagnostic);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un diagnóstico existente' })
  @ApiParam({ name: 'id', description: 'UUID del diagnóstico', type: String })
  @ApiResponse({ status: 200, description: 'Diagnóstico actualizado', type: SerializerDiagnosticDto })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateDiagnosticDto: UpdateDiagnosticDto
  ): Promise<SerializerDiagnosticDto> {
    const diagnostic = await this.diagnosticService.update(id, updateDiagnosticDto);
    return toDto(SerializerDiagnosticDto, diagnostic);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un diagnóstico de forma permanente', description: 'Eliminar un diagnóstico de forma permanente' })
  @ApiParam({ name: 'id', description: 'UUID del diagnóstico', type: String })
  @ApiResponse({ status: 200, description: 'Diagnóstico eliminado' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<{ message: string }> {
    const message = await this.diagnosticService.remove(id);
    return { message };
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch('soft-remove/:id')
  @ApiOperation({ summary: 'Soft delete de un diagnóstico', description: 'Soft delete de un diagnóstico' })
  @ApiParam({ name: 'id', description: 'UUID del diagnóstico', type: String })
  @ApiResponse({ status: 200, description: 'Diagnóstico soft deleted' })
  @ApiResponse({ status: 404, description: 'Not Found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async softRemove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<{ message: string }> {
    const message = await this.diagnosticService.softRemove(id);
    return { message };
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch('restore/:id')
  @ApiOperation({ summary: 'Restaurar un diagnóstico soft deleted', description: 'Restaurar un diagnóstico soft deleted' })
  @ApiParam({ name: 'id', description: 'UUID del diagnóstico', type: String })
  @ApiResponse({ status: 200, description: 'Diagnóstico restaurado', type: SerializerDiagnosticDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async restore(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<SerializerDiagnosticDto> {
    const diagnostic = await this.diagnosticService.restore(id);
    return toDto(SerializerDiagnosticDto, diagnostic);
  }

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('filtered')
  @ApiOperation({ summary: 'Obtener diagnósticos filtrados por nombre y paginados', description: 'Obtener diagnósticos filtrados por nombre y paginados' })
  @ApiQuery({ name: 'name', type: String, required: false, description: 'Nombre del diagnóstico' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1, description: 'Número de página' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10, description: 'Límite de resultados por página' })
  @ApiResponse({ status: 200, description: 'Diagnósticos filtrados obtenidos', type: SerializerDiagnosticDto, isArray: true })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findFilteredByName(
    @Query() query: any
  ): Promise<{ data: SerializerDiagnosticDto[]; meta: any; msg: string }> {
    const { name, page = 1, limit = 10 } = query;
    const paginationDto: PaginationDto = { page: Number(page), limit: Number(limit) };
    const { data, meta, msg } = await this.diagnosticService.findFilteredByName(name, paginationDto);
    return { data: data.map(d => toDto(SerializerDiagnosticDto, d)), meta, msg };
  }
}
