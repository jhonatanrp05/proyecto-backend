import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
} from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { AssessmentResponseDto } from './dto/assessment-response.dto';

@ApiTags('Assessments')
@ApiBearerAuth()
@Controller('assessments')
export class AssessmentsController {

  @Post()
  @ApiOperation({
    summary: 'Crear evaluación'
  })
  @ApiResponse({
    status: 201,
    description: 'Evaluación creada exitosamente',
    type: AssessmentResponseDto
  })
  create(
    @Body() createAssessmentDto: CreateAssessmentDto
  ): AssessmentResponseDto {

    return {} as AssessmentResponseDto;
  }

  @Get()
  @ApiOperation({
    summary: 'Listar evaluaciones'
  })
  @ApiResponse({
    status: 200,
    type: [AssessmentResponseDto]
  })
  findAll(): AssessmentResponseDto[] {

    return [];
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener evaluación por ID'
  })
  @ApiResponse({
    status: 200,
    type: AssessmentResponseDto
  })
  findOne(
    @Param('id') id: string
  ): AssessmentResponseDto {

    return {} as AssessmentResponseDto;
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar evaluación'
  })
  @ApiResponse({
    status: 200,
    type: AssessmentResponseDto
  })
  update(
    @Param('id') id: string,
    @Body() updateAssessmentDto: UpdateAssessmentDto
  ): AssessmentResponseDto {

    return {} as AssessmentResponseDto;
  }
}