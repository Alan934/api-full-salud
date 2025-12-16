import { Controller, Get, Query, Param, UseGuards, Patch, Body, Delete, Post } from '@nestjs/common';
import { FamilyGroupService } from './family-group.service';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { Role } from '../../domain/enums';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { UpdatePatientFamilyRelationsDto, SerializerPatientDto } from '../../domain/dtos';

@ApiTags('Family Group')
@Controller('family-group')
export class FamilyGroupController {
  constructor(private readonly familyGroupService: FamilyGroupService) {}

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.SECRETARY)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('heads')
  @ApiOperation({ summary: 'Listar jefes de familia', description: 'Lista paginada de pacientes que son jefes de grupo familiar' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10 })
  async getFamilyHeads(@Query('page') page = '1', @Query('limit') limit = '10') {
    return await this.familyGroupService.getFamilyHeads(Number(page), Number(limit));
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.SECRETARY)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get(':familyGroupId/members')
  @ApiOperation({ summary: 'Listar miembros de un grupo familiar' })
  @ApiParam({ name: 'familyGroupId', type: String, description: 'UUID del grupo familiar' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10 })
  async getFamilyMembers(
    @Param('familyGroupId') familyGroupId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10'
  ) {
    return await this.familyGroupService.getFamilyMembers(familyGroupId, Number(page), Number(limit));
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch('patient/:id/relations')
  @ApiOperation({ 
    summary: 'Actualizar relaciones familiares de un paciente',
    description: `Permite:
    - Asignar el paciente a un grupo existente (familyGroupId)
    - Desasociar del grupo (familyGroupId: null)
    - Vincular por jefe de familia (headPatientId). Si el jefe no tiene grupo familiar, se creará automáticamente uno llamado "Familia <Apellido del jefe>" y se asignará el paciente a ese grupo.`
  })
  @ApiParam({ name: 'id', type: String, description: 'UUID del paciente a actualizar' })
  @ApiBody({ required: true, type: UpdatePatientFamilyRelationsDto })
  @ApiResponse({ status: 200, description: 'Relaciones familiares actualizadas', type: SerializerPatientDto })
  @ApiResponse({ status: 404, description: 'Paciente o grupo familiar no encontrado' })
  async updateFamilyRelations(
    @Param('id') id: string,
    @Body() dto: UpdatePatientFamilyRelationsDto
  ) {
    return await this.familyGroupService.updateFamilyGroupRelations(id, dto);
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.SECRETARY, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Delete('patient/:id')
  @ApiOperation({ 
    summary: 'Eliminar paciente del grupo familiar', 
    description: `Elimina un paciente del sistema. Si el paciente es jefe de familia:
    - Elimina todos los miembros del grupo familiar
    - Desactiva el grupo familiar
    - Si no es jefe, solo elimina al paciente individual
    
    La eliminación es soft delete`
  })
  @ApiParam({ name: 'id', type: String, description: 'UUID del paciente a eliminar' })
  @ApiResponse({ 
    status: 200, 
    description: 'Paciente(s) eliminado(s) exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Patient soft deleted successfully' },
        affectedCount: { type: 'number', example: 1 },
        patientId: { type: 'string', example: 'b272afad-9488-4a91-8c62-fa5c91593f8c' },
        familyGroupId: { type: 'string', nullable: true, example: 'family-group-id' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async softDeleteCascade(@Param('id') id: string) {
    return await this.familyGroupService.softDeleteCascade(id);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('patient/:id/recover')
  @ApiOperation({ 
    summary: 'Recuperar paciente eliminado del grupo familiar', 
    description: `Recupera un paciente eliminado del sistema. Si el paciente era jefe de familia:
    - Recupera todos los miembros del grupo familiar que fueron eliminados
    - Reactiva el grupo familiar
    - Si no era jefe, solo recupera al paciente individual
    
    Solo puede recuperar pacientes que tengan deletedAt (soft delete)`
  })
  @ApiParam({ name: 'id', type: String, description: 'UUID del paciente a recuperar' })
  @ApiResponse({ 
    status: 200, 
    description: 'Paciente(s) recuperado(s) exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Patient recovered successfully' },
        affectedCount: { type: 'number', example: 1 },
        patientId: { type: 'string', example: 'b272afad-9488-4a91-8c62-fa5c91593f8c' },
        familyGroupId: { type: 'string', nullable: true, example: 'family-group-id' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado o no eliminado' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async recoverCascade(@Param('id') id: string) {
    return await this.familyGroupService.recoverCascade(id);
  }
}
