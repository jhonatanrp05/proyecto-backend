import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators';
import { Role } from '../../../shared/constants';
import { RecommendationsService } from '../application/recommendations.service';

@ApiTags('recommendations')
@ApiBearerAuth()
@Controller('submissions')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get(':id/recommendations')
  @Roles(Role.STUDENT, Role.PROFESSOR)
  @ApiOperation({
    summary: 'Get SQL optimization recommendations [STUDENT, PROFESSOR]',
    description:
      'Returns optimization recommendations generated after evaluating a submission',
  })
  @ApiResponse({
    status: 200,
    description: 'Recommendations retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Recommendations not yet available for this submission',
  })
  getRecommendations(@Param('id') id: string) {
    return this.recommendationsService.findBySubmissionId(id);
  }
}
