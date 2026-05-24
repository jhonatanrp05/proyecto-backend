import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

import { CreateChallengeUseCase } from '../application/use-cases/create-challenge.use-case';
import {
  GetChallengesUseCase,
  GetChallengeByIdUseCase,
} from '../application/use-cases/get-challenges.use-case';
import { UpdateChallengeUseCase } from '../application/use-cases/update-challenge.use-case';
import { ChangeChallengeStatusUseCase } from '../application/use-cases/change-challenge-status.use-case';
import {
  UploadSchemaUseCase,
  UploadSeedDataUseCase,
  SetExpectedResultUseCase,
} from '../application/use-cases/challenge-content.use-case';
import { GenerateDataUseCase } from '../application/use-cases/generate-data.use-case';
import { GetChallengeStatsUseCase } from '../application/use-cases/get-challenge-stats.use-case';

import { CreateChallengeDto } from '../application/dtos/create-challenge.dto';
import { UpdateChallengeDto } from '../application/dtos/update-challenge.dto';
import {
  ChangeChallengeStatusDto,
  UploadSchemaDto,
  UploadSeedDataDto,
  SetExpectedResultDto,
} from '../application/dtos/challenge-content.dto';
import { GenerateDataDto } from '../application/dtos/generate-data.dto';

import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles, CurrentUser } from '../../../shared/decorators';
import { Role } from '../../../shared/constants/roles.enum';
@ApiTags('Challenges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('challenges')
export class ChallengesController {
  constructor(
    private readonly createChallenge: CreateChallengeUseCase,
    private readonly getChallenges: GetChallengesUseCase,
    private readonly getChallengeById: GetChallengeByIdUseCase,
    private readonly updateChallenge: UpdateChallengeUseCase,
    private readonly changeChallengeStatus: ChangeChallengeStatusUseCase,
    private readonly uploadSchemaUseCase: UploadSchemaUseCase,
    private readonly uploadSeedData: UploadSeedDataUseCase,
    private readonly setExpectedResultUseCase: SetExpectedResultUseCase,
    private readonly generateData: GenerateDataUseCase,
    private readonly getStats: GetChallengeStatsUseCase,
  ) {}

  //  POST /challenges

  @Post()
  @Roles(Role.PROFESSOR)
  @ApiOperation({ summary: 'Crear un nuevo reto (draft)' })
  create(@Body() dto: CreateChallengeDto, @Request() req: any) {
    return this.createChallenge.execute(dto, req.user.id);
  }

  //  GET /challenges

  @Get()
  @Roles(Role.PROFESSOR, Role.STUDENT)
  @ApiOperation({ summary: 'Listar retos, con filtros opcionales' })
  findAll(@Query('courseId') courseId: string, @Request() req: any) {
    const isStudent = req.user.role === 'STUDENT';
    return this.getChallenges.execute({
      courseId,
      onlyPublished: isStudent,
      studentId: isStudent ? req.user.id : undefined,
    });
  }

  //  GET /challenges/:id

  @Get(':id')
  @Roles(Role.PROFESSOR, Role.STUDENT)
  findOne(@Param('id') id: string, @Request() req: any) {
    const isStudent = req.user.role === 'STUDENT';
    return this.getChallengeById.execute(
      id,
      isStudent,
      isStudent ? req.user.id : undefined,
    );
  }

  //  PATCH /challenges/:id

  @Patch(':id')
  @Roles(Role.PROFESSOR)
  @ApiOperation({ summary: 'Actualizar datos básicos del reto' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateChallengeDto,
    @Request() req: any,
  ) {
    return this.updateChallenge.execute(id, dto, req.user.id);
  }

  //  PATCH /challenges/:id/status

  @Patch(':id/status')
  @Roles(Role.PROFESSOR)
  @ApiOperation({
    summary: 'Cambiar estado del reto (draft → published → archived)',
  })
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeChallengeStatusDto,
    @Request() req: any,
  ) {
    return this.changeChallengeStatus.execute(id, dto.status, req.user.id);
  }

  //  POST /challenges/:id/schema

  @Post(':id/schema')
  @Roles(Role.PROFESSOR)
  @ApiOperation({ summary: 'Cargar o reemplazar el esquema DDL del reto' })
  uploadSchema(
    @Param('id') id: string,
    @Body() dto: UploadSchemaDto,
    @Request() req: any,
  ) {
    return this.uploadSchemaUseCase.execute(id, dto.ddlScript, req.user.id);
  }

  //  POST /challenges/:id/seed-data

  @Post(':id/seed-data')
  @Roles(Role.PROFESSOR)
  @ApiOperation({ summary: 'Cargar datos de prueba manualmente (INSERT INTO)' })
  uploadSeed(
    @Param('id') id: string,
    @Body() dto: UploadSeedDataDto,
    @Request() req: any,
  ) {
    return this.uploadSeedData.execute(id, dto.insertScript, req.user.id);
  }

  //  POST /challenges/:id/expected-result

  @Post(':id/expected-result')
  @Roles(Role.PROFESSOR)
  @ApiOperation({
    summary: 'Definir la query correcta y el resultado esperado',
  })
  setExpectedResult(
    @Param('id') id: string,
    @Body() dto: SetExpectedResultDto,
    @Request() req: any,
  ) {
    return this.setExpectedResultUseCase.execute(
      id,
      dto.query,
      dto.outputJson,
      req.user.id,
    );
  }

  //  POST /challenges/:id/generate-data

  @Post(':id/generate-data')
  @Roles(Role.PROFESSOR)
  @ApiOperation({
    summary: 'Generar datos de prueba automáticamente con faker',
  })
  generateSeedData(
    @Param('id') id: string,
    @Body() dto: GenerateDataDto,
    @Request() req: any,
  ) {
    return this.generateData.execute(id, dto, req.user.id);
  }
  @Get(':id/stats')
  @Roles(Role.PROFESSOR)
  @ApiOperation({
    summary: 'Get challenge statistics [PROFESSOR]',
    description: 'Returns analytics and statistics for a challenge',
  })
  @ApiResponse({
    status: 200,
    description: 'Challenge statistics retrieved successfully',
  })
  getChallengeStats(@Param('id') id: string) {
    return this.getStats.execute(id);
  }
}
