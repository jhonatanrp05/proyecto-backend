import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators';
import { Role } from '../../../shared/constants/roles.enum';
import { CurrentUser } from '../../../shared/decorators';
import { SubmissionsService } from '../application/submissions.service';
import { CreateSubmissionDto } from '../application/dtos/create-submission.dto';

@ApiTags('Submissions')
@ApiBearerAuth()
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.STUDENT)
  @ApiOperation({
    summary: 'Enviar una solución SQL [STUDENT]',
    description:
      'El estudiante envía una consulta SQL para un reto. El sistema la registra y la encola para evaluación automática.',
  })
  create(
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.submissionsService.create(dto, user.id);
  }

  @Get(':id')
  @Roles(Role.STUDENT, Role.PROFESSOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Consultar estado de un submission [STUDENT, PROFESSOR, ADMIN]',
    description:
      'Permite consultar el estado actual de un submission y su resultado si ya fue evaluado.',
  })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.submissionsService.findById(id, user);
  }
}
