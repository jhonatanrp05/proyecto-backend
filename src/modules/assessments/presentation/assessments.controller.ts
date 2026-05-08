import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';


import { Roles, CurrentUser } from '../../../shared/decorators';
import { Role } from '../../../shared/constants';
import { RolesGuard } from '../../../shared/guards';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { AssessmentResponseDto } from './dto/assessment-response.dto';

@ApiTags('assessments')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('assessments')
export class AssessmentsController {

  @Post()
  @Roles(Role.PROFESSOR)
  @ApiOperation({
    summary: 'Create assessment [PROFESSOR]',
    description: 'Allows a professor to create a new SQL assessment'
  })
  @ApiResponse({
    status: 201,
    description: 'Assessment created successfully',
    type: AssessmentResponseDto
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied'
  })
  create(
    @Body() createAssessmentDto: CreateAssessmentDto
  ): AssessmentResponseDto {

    return {} as AssessmentResponseDto;
  }

  @Get()
  @Roles(Role.PROFESSOR, Role.STUDENT)
  @ApiOperation({
    summary: 'Get all assessments [PROFESSOR, STUDENT]',
    description: 'Returns a list of all available assessments'
  })
  @ApiResponse({
    status: 200,
    description: 'Assessments retrieved successfully',
    type: [AssessmentResponseDto]
  })
  findAll(): AssessmentResponseDto[] {

    return [];
  }

  @Get(':id')
  @Roles(Role.PROFESSOR, Role.STUDENT)
  @ApiOperation({
    summary: 'Get assessment by ID [PROFESSOR, STUDENT]',
    description: 'Returns detailed information about a specific assessment'
  })
  @ApiResponse({
    status: 200,
    description: 'Assessment retrieved successfully',
    type: AssessmentResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Assessment not found'
  })
  findOne(
    @Param('id') id: string
  ): AssessmentResponseDto {

    return {} as AssessmentResponseDto;
  }

  @Patch(':id')
  @Roles(Role.PROFESSOR)
  @ApiOperation({
    summary: 'Update assessment [PROFESSOR]',
    description: 'Updates assessment information'
  })
  @ApiResponse({
    status: 200,
    description: 'Assessment updated successfully',
    type: AssessmentResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Assessment not found'
  })
  update(
    @Param('id') id: string,
    @Body() updateAssessmentDto: UpdateAssessmentDto
  ): AssessmentResponseDto {

    return {} as AssessmentResponseDto;
  }
}