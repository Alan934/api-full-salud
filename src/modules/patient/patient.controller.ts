import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PatientService } from './patient.service';
import {
  CreatePatientDto,
  SerializerPatientDto,
  UpdatePatientDto
} from '../../domain/dtos';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { AuthGuard, Roles, RolesGuard } from '../auth/guards/auth.guard';
import { Role, DocumentType } from '../../domain/enums';
import { plainToInstance } from 'class-transformer';
import { SerializerPatientDetailsDto } from '../../domain/dtos/patient/patient-details-serializer.dto';

@ApiTags('Patient')
@Controller('patient')
export class PatientController {
  constructor(protected readonly patientService: PatientService) {
  }

  @Post()
  @ApiOperation({ 
    summary: 'Crear un Paciente', 
    description: `
    Crear un paciente nuevo con soporte para grupos familiares.

    Opciones de creación:
    1. Paciente individual: Enviar solo los datos del paciente
    2. Unirse a grupo familiar existente: Incluir headPatientId con el ID del jefe de familia.
      - Si el jefe NO tiene grupo, se creará automáticamente uno llamado "Familia <Apellido del jefe>" y se asignará el paciente a ese grupo.
    3. Crear nuevo grupo familiar: Incluir objeto familyGroup con datos del grupo y familiares opcionales en familyData.familyMembers

    Notas sobre familyData.familyMembers:
    - Se utiliza CreatePatientForFamilyDto (sin email ni password)
    - Puede incluir datos personales y de documento (por ejemplo: name, lastName, documentType, dni, phone)
    - NO enviar familyGroup ni familyData dentro de cada miembro

    Ejemplos:
    \u0060\u0060\u0060json
    // Unirse a grupo familiar existente (auto-crea el grupo si el jefe no tiene):
    {
      "name": "Juan",
      "lastName": "Pérez",
      "email": "juan@example.com",
      "documentType": "dni",
      "dni": "42098163",
      "headPatientId": "uuid-del-jefe-familia"
    }

    // Crear nuevo grupo familiar con familiares:
    {
      "name": "María",
      "lastName": "García", 
      "email": "maria@example.com",
      "documentType": "dni",
      "dni": "40123456",
      "familyGroup": {
        "familyGroupName": "Familia García",
        "familyDescription": "Familia de 4 miembros"
      },
      "familyData": {
        "familyMembers": [
          {
            "name": "Pedro",
            "lastName": "García",
            "documentType": "dni",
            "dni": "50123456"
          },
          {
            "name": "Ana",
            "lastName": "García"
          }
        ]
      }
    }
    \u0060\u0060\u0060` 
  })
  @ApiBody({
    description: 'Payload para crear paciente (con o sin grupo familiar) y opcionalmente miembros del grupo en familyData.familyMembers',
    required: true,
    type: CreatePatientDto,
    examples: {
      joinExistingFamily: {
        summary: 'Unirse a grupo familiar existente',
        value: {
          name: 'Juan',
          lastName: 'Pérez',
          email: 'juan@example.com',
          documentType: 'dni',
          dni: '42098163',
          headPatientId: '550e8400-e29b-41d4-a716-446655440000'
        }
      },
      createNewFamilyWithMembers: {
        summary: 'Crear nuevo grupo familiar con familiares',
        value: {
          name: 'María',
          lastName: 'García',
          email: 'maria@example.com',
          documentType: 'dni',
          dni: '40123456',
          familyGroup: {
            familyGroupName: 'Familia García',
            familyDescription: 'Familia de 4 miembros'
          },
          familyData: {
            familyMembers: [
              {
                name: 'Pedro',
                lastName: 'García',
                documentType: 'dni',
                dni: '50123456'
              },
              {
                name: 'Ana',
                lastName: 'García'
              }
            ]
          }
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Patient created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  async createPatient(@Body() createPatientDto: CreatePatientDto) {
    return await this.patientService.createPatient(createPatientDto);
  }

  @Roles(Role.ADMIN, Role.PRACTITIONER, Role.PATIENT, Role.SECRETARY)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get()
  @ApiOperation({ summary: 'Get patients with filters and pagination' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10, description: 'Number of results per page (default: 10)' })
  @ApiQuery({ name: 'patientId', type: String, required: false, description: 'Patient ID to filter (optional)' })
  @ApiQuery({ name: 'patientName', type: String, required: false, description: 'Patient name to filter (optional)' })
  @ApiQuery({ name: 'patientDni', type: String, required: false, description: 'Patient DNI to filter (optional)' })
  @ApiQuery({ name: 'patientEmail', type: String, required: false, description: 'Patient email to filter (optional)' })
  @ApiQuery({
    name: 'status',
    type: String,
    required: false,
    description: 'Appointment statuses separated by commas (example: completed,pending)',
  })
  @ApiResponse({ status: 200, description: 'Patients retrieved successfully', type: SerializerPatientDto, isArray: true })
  @ApiResponse({ status: 404, description: 'Patients not found' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getAll(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('patientId') patientId?: string,
    @Query('patientName') patientName?: string,
    @Query('patientDni') patientDni?: string,
    @Query('patientEmail') patientEmail?: string,
    @Query('status') status?: string
  ): Promise<{ patients: SerializerPatientDto[]; total: number; page: number; limit: number }> {
    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    const statusArray = status ? status.split(',') : [];

    const { patients, total } = await this.patientService.getAll(
      pageNumber,
      limitNumber,
      patientId,
      patientName,
      patientDni,
      patientEmail,
      statusArray
    );

    const serializedPatients = plainToInstance(SerializerPatientDto, patients, {
      excludeExtraneousValues: true,
    });

    return { patients: serializedPatients, total, page: pageNumber, limit: limitNumber };
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get(':id')
  @ApiOperation({ summary: 'Obtener un paciente por ID', description: 'Obtener un paciente por ID' })
  @ApiQuery({ 
    name: 'withFamilyMembers', 
    description: 'true para incluir el resto de los miembros del mismo grupo familiar. Por defecto false.',
    required: false,
    type: Boolean })
  @ApiResponse({ status: 200, description: 'Paciente obtenido exitosamente', type: SerializerPatientDto })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getOnePatient(
    @Param('id') id: string, 
    @Query('withFamilyMembers') withFamilyMembers?: string,
  ) {
    const withFamilyMembersBool = withFamilyMembers === 'true';
    //return await this.patientService.getOne(id, withFamilyMembersBool);
    const patient = await this.patientService.getOne(id, withFamilyMembersBool);
    return plainToInstance(SerializerPatientDetailsDto, patient, { excludeExtraneousValues: true });
  }


  @Roles(Role.PRACTITIONER, Role.ADMIN, Role.PATIENT, Role.SECRETARY)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Patch(':id')
  @ApiOperation({
      summary: 'Actualizar un paciente',
      description: `
    Actualizar un paciente por ID.

    \`\`\`json
    - Para crear un nuevo socialWorkEnrollment enviar el dto SIN el id, ejemplo: 
    "socialWorkEnrollment": {
      "memberNum": "12345678",
      "plan": "A25",
      "socialWork": { "id": "f6604bd9-1c76-47c3-82b1-a30813a66b59" }
    }
    - Para modificar un socialWorkEnrollment existente, enviar el id en el dto, ejemplo:
    "socialWorkEnrollment": {
      "id": "fb577dda-b7ae-4f5b-b5e6-2ca30807f8d4",
      "plan": "A3000",
      "socialWork": { "id": "f6604bd9-1c76-47c3-82b1-a30813a66b59" }
    }
    \`\`\`
    `,
  })
  @ApiResponse({ status: 200, description: 'Paciente actualizado exitosamente', type: SerializerPatientDto })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async updatePatient(@Param('id') id: string, @Body() updatePatientDto: UpdatePatientDto) {
    return await this.patientService.update(id, updatePatientDto);
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un paciente', description: 'Eliminar un paciente por ID' })
  @ApiResponse({ status: 200, description: 'Paciente eliminado exitosamente', type: SerializerPatientDto })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async softDelete(@Param('id') id: string) {
    return await this.patientService.softDelete(id);
  }

  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Post('/recover/:id')
  @ApiOperation({ summary: 'Recuperar un paciente', description: 'Recuperar un paciente por ID' })
  @ApiResponse({ status: 200, description: 'Paciente recuperado exitosamente', type: SerializerPatientDto })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async recover(@Param('id') id: string) {
    return await this.patientService.recover(id);
  }

  @Roles(Role.PRACTITIONER, Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiBearerAuth('bearerAuth')
  @Get('document/:type/:number')
  @ApiOperation({ 
    summary: 'Obtener un paciente por tipo y número de documento', 
    description: `Recupera un paciente utilizando tipo de documento y número.

      Opcionalmente podés:
      - Incluir turnos del paciente (withAppointments=true)
      - Incluir miembros del mismo grupo familiar (withFamilyMembers=true)

      Notas:
      - Para DNI se esperan 7 u 8 dígitos.
      - Para PASSPORT se aceptan 6 a 12 caracteres alfanuméricos.
      - Si withFamilyMembers=true y el paciente pertenece a un grupo familiar, se devuelve en la propiedad 'familyMembers' (excluye al propio paciente).` 
  })
  @ApiOperation({ summary: 'Obtener un paciente por tipo de documento y número', description: 'Obtener un paciente por tipo de documento y número' })
  @ApiQuery({ name: 'withFamilyMembers', required: false, type: Boolean, description: 'true para incluir el resto de los miembros del grupo familiar' })
  @ApiResponse({ 
    status: 200, 
    description: 'Paciente encontrado',
    type: SerializerPatientDto 
  })
  @ApiResponse({ status: 400, description: 'Formato de documento inválido' })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado' })
  @ApiResponse({ status: 403, description: 'Forbidden resource' })
  async getPatientByDocument(
    @Param('type') type: DocumentType,
    @Param('number') number: string,
    @Query('withFamilyMembers') withFamilyMembers?: string,
  ) {
    const withFamilyMembersBool = withFamilyMembers === 'true';
    return await this.patientService.getByDocument(type, number, withFamilyMembersBool);
  }
}
