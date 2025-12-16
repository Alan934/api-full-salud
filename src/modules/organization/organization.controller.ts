import { Body, Controller, Get, Param, Post, Query, Patch, UseGuards } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { Organization } from '../../domain/entities';
import { ControllerFactory } from '../../common/factories/controller.factory';
import {
  CreateOrganizationDto,
  SerializerOrganizationDto,
  UpdateOrganizationDto
} from '../../domain/dtos';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { toDto } from '../../common/util/transform-dto.util';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { Role } from '../../domain/enums';

@ApiTags('Organization')
@Controller('organization')
export class OrganizationController extends ControllerFactory<
  Organization,
  CreateOrganizationDto,
  UpdateOrganizationDto,
  SerializerOrganizationDto
>(
  Organization,
  CreateOrganizationDto,
  UpdateOrganizationDto,
  SerializerOrganizationDto
) {
  constructor(protected service: OrganizationService) {
    super();
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Post()
  @ApiOperation({ description: 'Crear una nueva organización', summary: 'Crear una nueva organización' })
  @ApiResponse({ status: 201, description: 'practitionerRole created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' }) 
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @ApiCreatedResponse({ type: SerializerOrganizationDto })
  async create(@Body() createDto: CreateOrganizationDto): Promise<SerializerOrganizationDto> {
    const organization = await this.service.create(createDto);
    return toDto(SerializerOrganizationDto, organization);
  }

  // @Get()
  // @ApiOperation({
  //   description: 'Obtener organizations con filtros opcionales con paginación'
  // })
  // @ApiPaginationResponse(SerializerOrganizationDto)
  // override async findAll(
  //   @Query() paginationDto: OrganizationPaginationDto
  // ): Promise<{ data: SerializerOrganizationDto[]; meta: PaginationMetadata }> {
  //   const { data, meta } = await this.service.findAll(paginationDto);
  //   const serializedData = toDtoList(SerializerOrganizationDto, data);

  //   return { data: serializedData, meta };
  // }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get(':id')
  @ApiOperation({ description: 'Obtener una organización por su ID con todas sus relaciones', summary: 'Obtener una organización por su ID con todas sus relaciones' })
  @ApiResponse({ status: 200, description: 'Organización found' })
  @ApiResponse({ status: 404, description: 'Organización not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @ApiOkResponse({ type: SerializerOrganizationDto })
  async findOne(@Param('id') id: string): Promise<SerializerOrganizationDto> {
    const organization = await this.service.getOne(id);
    return toDto(SerializerOrganizationDto, organization);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch(':id')
  @ApiOperation({ description: 'Actualizar una organización por su ID', summary: 'Actualizar una organización por su ID' })
  @ApiResponse({ status: 404, description: 'Organización not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  @ApiOkResponse({ type: SerializerOrganizationDto })
  async update(@Param('id') id: string, @Body() updateDto: UpdateOrganizationDto): Promise<SerializerOrganizationDto> {
    const organization = await this.service.update(id, updateDto);
    return toDto(SerializerOrganizationDto, organization);
  }
}
