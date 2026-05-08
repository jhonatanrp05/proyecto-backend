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

@ApiTags('challenges')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('challenges')

export class ChallengesController {

    @Post()
    @Roles(Role.PROFESSOR)
    @ApiOperation({
      summary: 'Create challenge [PROFESSOR]',
      description: 'Allows a professor to create a new SQL challenge'
    })
    @ApiResponse({
      status: 201,
      description: 'Challenge created successfully'
    })
    create() {
      return {};
    }  

    @Get()
    @Roles(Role.PROFESSOR, Role.STUDENT)
    @ApiOperation({
      summary: 'Get all challenges [PROFESSOR, STUDENT]',
      description: 'Returns all available SQL challenges'
    })
    @ApiResponse({
      status: 200,
      description: 'Challenges retrieved successfully'
    })
    findAll() {
      return [];
    }

    @Get(':id')
    @Roles(Role.PROFESSOR, Role.STUDENT)
    @ApiOperation({
      summary: 'Get challenge by ID [PROFESSOR, STUDENT]',
      description: 'Returns detailed information about a challenge'
    })
    @ApiResponse({
      status: 200,
      description: 'Challenge retrieved successfully'
    })
    @ApiResponse({
      status: 404,
      description: 'Challenge not found'
    })
    findOne(
      @Param('id') id: string
    ) {
      return {};
    }

    @Patch(':id')
    @Roles(Role.PROFESSOR)
    @ApiOperation({
      summary: 'Update challenge [PROFESSOR]',
      description: 'Updates challenge information'
    })
    @ApiResponse({
      status: 200,
      description: 'Challenge updated successfully'
    })
    update(
      @Param('id') id: string,
    ) {
      return {};
    }

    @Patch(':id/status')
    @Roles(Role.PROFESSOR)
    @ApiOperation({
      summary: 'Update challenge status [PROFESSOR]',
      description: 'Updates the publication status of a challenge'
    })
    @ApiResponse({
      status: 200,
      description: 'Challenge status updated successfully'
    })
    updateStatus(
      @Param('id') id: string
    ) {
      return {};
    }

    @Post(':id/schema')
    @Roles(Role.PROFESSOR)
    @ApiOperation({
      summary: 'Upload challenge schema [PROFESSOR]',
      description: 'Uploads the database schema for a challenge'
    })
    @ApiResponse({
      status: 201,
      description: 'Schema uploaded successfully'
    })
    uploadSchema(
      @Param('id') id: string
    ) {
      return {};
    }

    @Post(':id/seed-data')
    @Roles(Role.PROFESSOR)
    @ApiOperation({
      summary: 'Upload seed data [PROFESSOR]',
      description: 'Uploads initial seed data for the challenge database'
    })
    @ApiResponse({
      status: 201,
      description: 'Seed data uploaded successfully'
    })
    uploadSeedData(
      @Param('id') id: string
    ) {
      return {};
    }

    @Post(':id/expected-result')
    @Roles(Role.PROFESSOR)
    @ApiOperation({
      summary: 'Upload expected result [PROFESSOR]',
      description: 'Uploads the expected SQL query result for validation'
    })
    @ApiResponse({
      status: 201,
      description: 'Expected result uploaded successfully'
    })
    uploadExpectedResult(
      @Param('id') id: string
    ) {
      return {};
    }

    @Post(':id/generate-data')
    @Roles(Role.PROFESSOR)
    @ApiOperation({
      summary: 'Generate challenge data [PROFESSOR]',
      description: 'Automatically generates random test data for the challenge'
    })
    @ApiResponse({
      status: 201,
      description: 'Challenge data generated successfully'
    })
    generateData(
      @Param('id') id: string
    ) {
      return {};
    }

    @Get(':id/stats')
    @Roles(Role.PROFESSOR)
    @ApiOperation({
    summary: 'Get challenge statistics [PROFESSOR]',
    description: 'Returns analytics and statistics for a challenge'
    })
    @ApiResponse({
    status: 200,
    description: 'Challenge statistics retrieved successfully'
    })
    getChallengeStats(
    @Param('id') id: string
    ) {
    return {};
    }

    @Get(':id/submissions')
    @Roles(Role.PROFESSOR)
    @ApiOperation({
      summary: 'Get challenge submissions [PROFESSOR]',
      description: 'Returns all submissions associated with a challenge'
    })
    @ApiResponse({
      status: 200,
      description: 'Challenge submissions retrieved successfully'
    })
    getChallengeSubmissions(
      @Param('id') id: string
    ) {
      return [];
    }

}