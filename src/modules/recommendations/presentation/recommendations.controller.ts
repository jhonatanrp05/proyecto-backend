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

@ApiTags('recommendations')
@ApiBearerAuth()
@Controller('submissions')
export class RecommendationsController {

  @Get(':id/recommendations')
  @Roles(Role.STUDENT, Role.PROFESSOR)
  @ApiOperation({
    summary: 'Get submission recommendations [STUDENT, PROFESSOR]',
    description: 'Returns optimization and learning recommendations for a submission'
  })
  @ApiResponse({
    status: 200,
    description: 'Recommendations retrieved successfully'
  })
  getRecommendations(
    @Param('id') id: string
  ) {
    return {};
  }

}