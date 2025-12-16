import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  UseGuards
} from '@nestjs/common';
import { IpService } from './ip.service';
import { CreateIpDto, UpdateIpDto } from '../../domain/dtos/ip/ip.dto';
import { SerializerIpDto } from '../../domain/dtos/ip/ip-serializer.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth
} from '@nestjs/swagger';
import { toDto, toDtoList } from '../../common/util/transform-dto.util';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { Role } from '../../domain/enums';

@ApiTags('IP')
@Controller('ip')
export class IpController {
  constructor(private readonly ipService: IpService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva IP' })
  @ApiBody({ type: CreateIpDto })
  @ApiResponse({ status: 201, description: 'IP creada exitosamente', type: SerializerIpDto })
  async create(@Body() createIpDto: CreateIpDto): Promise<SerializerIpDto> {
    const entity = await this.ipService.create(createIpDto);
    return toDto(SerializerIpDto, entity);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get()
  @ApiOperation({ summary: 'Obtener todas las IPs' })
  @ApiResponse({ status: 200, description: 'Lista de IPs', type: [SerializerIpDto] })
  async getAll(): Promise<SerializerIpDto[]> {
    const entities = await this.ipService.getAll();
    return toDtoList(SerializerIpDto, entities);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get(':id')
  @ApiOperation({ summary: 'Obtener una IP por ID' })
  @ApiParam({ name: 'id', description: 'ID de la IP' })
  @ApiResponse({ status: 200, description: 'IP encontrada', type: SerializerIpDto })
  @ApiResponse({ status: 404, description: 'IP no encontrada' })
  async getOne(@Param('id') id: string): Promise<SerializerIpDto> {
    const entity = await this.ipService.getOne(id);
    return toDto(SerializerIpDto, entity);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')  
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una IP' })
  @ApiParam({ name: 'id', description: 'ID de la IP a actualizar' })
  @ApiBody({ type: UpdateIpDto })
  @ApiResponse({ status: 200, description: 'IP actualizada', type: SerializerIpDto })
  @ApiResponse({ status: 404, description: 'IP no encontrada' })
  async update(
    @Param('id') id: string,
    @Body() updateIpDto: UpdateIpDto
  ): Promise<SerializerIpDto> {
    const entity = await this.ipService.update(id, updateIpDto);
    return toDto(SerializerIpDto, entity);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')  
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar (soft delete) una IP' })
  @ApiParam({ name: 'id', description: 'ID de la IP a eliminar' })
  @ApiResponse({
    status: 200,
    description: 'IP eliminada correctamente',
    schema: { example: { message: 'IP con id "..." eliminada correctamente' } }
  })
  @ApiResponse({ status: 404, description: 'IP no encontrada' })
  async deleted(@Param('id') id: string): Promise<{ message: string }> {
    return this.ipService.deleted(id);
  }
}