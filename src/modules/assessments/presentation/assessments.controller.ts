import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Delete
} from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';

import { Roles, CurrentUser } from '../../../shared/decorators';
import { Role } from '../../../shared/constants';
import { RolesGuard } from '../../../shared/guards';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { AssessmentResponseDto } from './dto/assessment-response.dto';

import { CreateAssessmentUseCase } from '../application/use-cases/create-assessment.use-case';
import { GetAssessmentUseCase } from '../application/use-cases/get-assessment.use-case';
import { GetAllAssessmentsUseCase } from '../application/use-cases/get-all-assessments.use-case';
import { UpdateAssessmentUseCase } from '../application/use-cases/update-assessment.use-case';
import { AssessmentMapper } from '../application/mappers/assessment.mapper';


@ApiTags('assessments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assessments')
export class AssessmentsController {
  constructor(
    private readonly createAssessmentUseCase: CreateAssessmentUseCase,
    private readonly getAssessmentUseCase: GetAssessmentUseCase,
    private readonly getAllAssessmentsUseCase: GetAllAssessmentsUseCase,
    private readonly updateAssessmentUseCase: UpdateAssessmentUseCase,
  ) {}

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
  async create(
    @Body() body: CreateAssessmentDto,
  ): Promise<AssessmentResponseDto> {
  const assessment = await this.createAssessmentUseCase.execute(body);
  return AssessmentMapper.toResponse(assessment);  }

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
  async findAll(): Promise<AssessmentResponseDto[]> {
    const assessments = await this.getAllAssessmentsUseCase.execute();
    return assessments.map(AssessmentMapper.toResponse);
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
  async findOne(@Param('id') id: string): Promise<AssessmentResponseDto> {
    const assessment = await this.getAssessmentUseCase.execute(id);
    return AssessmentMapper.toResponse(assessment);
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
  async update(@Param('id') id: string, @Body() body: UpdateAssessmentDto): Promise<AssessmentResponseDto> {
    const assessment = await this.updateAssessmentUseCase.execute(id, body);
    return AssessmentMapper.toResponse(assessment);
}
}