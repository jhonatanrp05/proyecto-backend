import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { Roles, CurrentUser } from '../../../shared/decorators';
import { Role } from '../../../shared/constants';
import { AssessmentsService } from '../application/assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';

class AddChallengeDto {
  @ApiProperty({ example: 'challenge-uuid' })
  challengeId: string;

  @ApiProperty({
    example: 1,
    description: 'Orden del reto dentro de la evaluaci�n',
  })
  order: number;
}

@ApiTags('assessments')
@ApiBearerAuth()
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Post()
  @Roles(Role.PROFESSOR)
  @ApiOperation({ summary: 'Create assessment [PROFESSOR]' })
  @ApiResponse({ status: 201, description: 'Assessment created' })
  create(@Body() dto: CreateAssessmentDto, @CurrentUser('id') userId: string) {
    return this.assessmentsService.create(userId, dto);
  }

  @Get()
  @Roles(Role.PROFESSOR, Role.STUDENT, Role.ADMIN)
  @ApiOperation({ summary: 'List assessments [PROFESSOR, STUDENT, ADMIN]' })
  @ApiQuery({ name: 'courseId', required: false })
  findAll(
    @Query('courseId') courseId: string | undefined,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.assessmentsService.findAll(courseId, user);
  }

  @Get(':id')
  @Roles(Role.PROFESSOR, Role.STUDENT)
  @ApiOperation({ summary: 'Get assessment by ID [PROFESSOR, STUDENT]' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.assessmentsService.findById(id, user);
  }

  @Patch(':id')
  @Roles(Role.PROFESSOR)
  @ApiOperation({ summary: 'Update assessment [PROFESSOR]' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.assessmentsService.update(id, userId, dto);
  }

  @Delete(':id')
  @Roles(Role.PROFESSOR)
  @ApiOperation({ summary: 'Delete assessment [PROFESSOR]' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.assessmentsService.delete(id, userId);
  }

  @Post(':id/challenges')
  @Roles(Role.PROFESSOR)
  @ApiOperation({ summary: 'Add challenge to assessment [PROFESSOR]' })
  addChallenge(@Param('id') id: string, @Body() dto: AddChallengeDto) {
    return this.assessmentsService.addChallenge(
      id,
      dto.challengeId,
      dto.order ?? 0,
    );
  }

  @Delete(':id/challenges/:challengeId')
  @Roles(Role.PROFESSOR)
  @ApiOperation({ summary: 'Remove challenge from assessment [PROFESSOR]' })
  removeChallenge(
    @Param('id') id: string,
    @Param('challengeId') challengeId: string,
  ) {
    return this.assessmentsService.removeChallenge(id, challengeId);
  }

  @Post(':id/attempts')
  @Roles(Role.STUDENT)
  @ApiOperation({
    summary: 'Start an assessment attempt [STUDENT]',
    description:
      'Registra un intento si la evaluación está activa y no se superó el máximo de intentos.',
  })
  startAttempt(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.assessmentsService.startAttempt(id, userId);
  }

  @Get(':id/attempts')
  @Roles(Role.STUDENT, Role.PROFESSOR)
  @ApiOperation({
    summary: 'List attempts [STUDENT, PROFESSOR]',
    description:
      'El estudiante ve sus propios intentos; el profesor del curso ve todos.',
  })
  listAttempts(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.assessmentsService.listAttempts(id, user);
  }
}
