import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { ControllerFactory } from '../../common/factories/controller.factory';
import {
  CreateBranchDto,
  SerializerBranchDto,
  UpdateBranchDto
} from '../../domain/dtos';
import { Branch } from '../../domain/entities';
import { BranchService } from './branch.service';
import { toDto, toDtoList } from '../../common/util/transform-dto.util';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { Role } from '../../domain/enums';
import { ApiPaginationResponse } from '../../common/swagger/api-pagination-response';
import { BranchFilteredPaginationDto } from '../../domain/dtos/branch/branch-filtered-pagination.dto';

@ApiTags('Branch')
@Controller('branch')
export class BranchController extends ControllerFactory<
  Branch,
  CreateBranchDto,
  UpdateBranchDto,
  SerializerBranchDto
>(Branch, CreateBranchDto, UpdateBranchDto, SerializerBranchDto) {
  constructor(protected service: BranchService) {
    super();
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener una sucursal por su ID',
    description: 'Obtener una sucursal por su ID'
  })
  @ApiParam({ name: 'id', description: 'ID de la sucursal', type: String })
  @ApiResponse({ status: 200, description: 'Branch found' })
  @ApiResponse({ status: 404, description: 'Branch not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    const data = await this.service.findOne(id);
    return toDto(SerializerBranchDto, data) as unknown as SerializerBranchDto;
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.SECRETARY, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('pagination')
  @ApiOperation({
    summary: 'Obtener sucursales con filtros y paginacion',
    description:
      'lista de sucursales filtrada por organizationId y isMainBranch, con paginación.'
  })
  @ApiPaginationResponse(SerializerBranchDto)
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)'
  })
  @ApiQuery({
    name: 'organizationId',
    required: false,
    type: String,
    description: 'Filter by Organization ID'
  })
  @ApiQuery({
    name: 'isMainBranch',
    required: false,
    type: Boolean,
    description: 'Filter by main branch status'
  })
  async findAllPaginated(
    @Query() filterPaginationDto: BranchFilteredPaginationDto
  ): Promise<{
    data: SerializerBranchDto[];
    total: number;
    lastPage: number;
    msg?: string;
  }> {
    const { data, total, lastPage, msg } =
      await this.service.findAllPaginated(filterPaginationDto);
    const serializedData = toDtoList(SerializerBranchDto, data);
    return { data: serializedData, total, lastPage, msg };
  }
}
