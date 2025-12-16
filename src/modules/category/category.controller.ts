import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { CategoryService } from './category.service';
import { ControllerFactory } from '../../common/factories/controller.factory';
import { Category } from '../../domain/entities';
import { CreateCategoryDto, SerializerCategoryDto, UpdateCategoryDto } from '../../domain/dtos';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '../../domain/enums';
import { ApiPaginationResponse } from '../../common/swagger/api-pagination-response';
import { FilteredCategoryDto } from '../../domain/dtos/category/filtered-category.dto';
import { toDto, toDtoList } from '../../common/util/transform-dto.util';
import { PaginationMetadata } from '../../common/util/pagination-data.util';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';

@ApiTags('Category')
@Controller('category')
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Crear una nueva categoría' })
  @ApiBody({ type: CreateCategoryDto })
  @ApiCreatedResponse({
    description: 'Categoría creada exitosamente',
    type: SerializerCategoryDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 409, description: 'Categoría ya existe' })
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    const category = await this.service.createCategory(createCategoryDto);
    return toDto(SerializerCategoryDto, category);
  }

  @Get()
  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.SECRETARY, Role.PATIENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Obtener categorías con filtros opcionales y paginación',
    description: 'Obtener categorías con filtros opcionales y paginación'
  })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @ApiPaginationResponse(SerializerCategoryDto)
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items por página (default: 10)' })
  @ApiQuery({ name: 'name', required: false, type: String, description: 'Filtrar por nombre' })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Filtrar por ID' })
  async findAll(@Query() query: FilteredCategoryDto) {
    const { data, meta } = await this.service.findAllFiltered(query);
    return { 
      data: toDtoList(SerializerCategoryDto, data), 
      meta 
    };
  }

  @Get(':id')
  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Obtener una categoría por ID', description: 'Obtener una categoría por ID' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const category = await this.service.findOne(id);
    return toDto(SerializerCategoryDto, category);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Actualizar una categoría', description: 'Actualizar una categoría' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  @ApiResponse({ status: 409, description: 'Nombre de categoría ya existe' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto
  ) {
    const category = await this.service.update(id, updateCategoryDto);
    return toDto(SerializerCategoryDto, category);
  }

  @Delete(':id')
  @Roles(Role.PRACTITIONER, Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Eliminar una categoría', description: 'Eliminar una categoría' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  @ApiResponse({ status: 403, description: 'Recurso prohibido' })
  async softDelete(@Param('id') id: string) {
    return await this.service.softDelete(id);
  }

  @Post('/recover/:id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Recuperar una categoría', description: 'Recuperar una categoría' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  @ApiResponse({ status: 403, description: 'Recurso prohibido' })
  async recover(@Param('id') id: string) {
    return await this.service.recover(id);
  }
}