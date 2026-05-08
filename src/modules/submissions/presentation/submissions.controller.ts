import {
  Controller,
  Get,
  Post,
  Param,
  Body,
} from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { Roles, CurrentUser } from '../../../shared/decorators';
import { Role } from '../../../shared/constants';

@ApiTags('submissions')
@ApiBearerAuth()
@Controller('submissions')
export class SubmissionsController {

  @Post()
  @Roles(Role.STUDENT)
  @ApiOperation({
    summary: 'Create submission [STUDENT]',
    description: 'Allows a student to submit a SQL query solution'
  })
  @ApiResponse({
    status: 201,
    description: 'Submission created successfully'
  })
  create(
    @Body() body: any
  ) {
    return {};
  }

  @Get(':id')
  @Roles(Role.STUDENT, Role.PROFESSOR)
  @ApiOperation({
    summary: 'Get submission by ID [STUDENT, PROFESSOR]',
    description: 'Returns detailed information about a submission'
  })
  @ApiResponse({
    status: 200,
    description: 'Submission retrieved successfully'
  })
  @ApiResponse({
    status: 404,
    description: 'Submission not found'
  })
  findOne(
    @Param('id') id: string
  ) {
    return {};
  }

  @Get(':id/result')
  @Roles(Role.STUDENT, Role.PROFESSOR)
  @ApiOperation({
    summary: 'Get submission result [STUDENT, PROFESSOR]',
    description: 'Returns execution result and evaluation status for a submission'
  })
  @ApiResponse({
    status: 200,
    description: 'Submission result retrieved successfully'
  })
  getResult(
    @Param('id') id: string
  ) {
    return {};
  }

  @Get(':id/feedback')
  @Roles(Role.STUDENT)
  @ApiOperation({
    summary: 'Get submission feedback [STUDENT]',
    description: 'Returns personalized feedback for a submission'
  })
  @ApiResponse({
    status: 200,
    description: 'Feedback retrieved successfully'
  })
  getFeedback(
    @Param('id') id: string
  ) {
    return {};
  }

}