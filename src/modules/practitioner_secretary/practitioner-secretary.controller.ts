import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreatePractitionerSecretaryDto,
  UpdatePractitionerSecretaryDto,
  SerializerPractitionerSecretaryDto,
} from '../../domain/dtos';
import { PractitionerSecretaryService } from './practitioner-secretary.service';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { Role } from '../../domain/enums';
import { ApiPaginationResponse } from '../../common/swagger/api-pagination-response';
import { toDto, toDtoList } from '../../common/util/transform-dto.util';

@ApiTags('PractitionerSecretary')
@Controller('practitioner-secretary')
export class PractitionerSecretaryController {
  constructor(private readonly service: PractitionerSecretaryService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Create a new practitioner-secretary relation' })
  @ApiResponse({
    status: 201,
    description: 'The created relation',
    type: SerializerPractitionerSecretaryDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Practitioner, secretary or location not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async create(
    @Body() createDto: CreatePractitionerSecretaryDto,
  ): Promise<SerializerPractitionerSecretaryDto> {
    const entity = await this.service.create(createDto);
    return toDto(SerializerPractitionerSecretaryDto, entity);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Get a practitioner-secretary relation by ID' })
  @ApiParam({ name: 'id', description: 'PractitionerSecretary ID' })
  @ApiResponse({ status: 200, type: SerializerPractitionerSecretaryDto })
  @ApiResponse({ status: 404, description: 'Relation not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })

  async getOne(@Param('id') id: string): Promise<SerializerPractitionerSecretaryDto> {
    const entity = await this.service.getOne(id);
    return toDto(SerializerPractitionerSecretaryDto, entity);
  }

}
