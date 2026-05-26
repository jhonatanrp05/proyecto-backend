import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators';
import { Role } from '../../../shared/constants';
import { GenerateRecommendationUseCase } from '../application/use-cases/generate-recommendation.use-case';
import { RecommendationResponseDto } from './dto/recommendation-response.dto';

@ApiTags('recommendations')
@ApiBearerAuth()
@Controller('submissions')
export class RecommendationsController {
  constructor(
    private readonly generateRecommendationUseCase: GenerateRecommendationUseCase,
  ) {}

  @Get(':id/recommendations')
  @Roles(Role.STUDENT, Role.PROFESSOR)
  @ApiOperation({
    summary: 'Get SQL optimization recommendations [STUDENT, PROFESSOR]',
    description:
      'Returns optimization recommendations generated after evaluating a submission',
  })
  @ApiParam({ name: 'id', description: 'ID de la submission' })
  @ApiResponse({
    status: 200,
    type: RecommendationResponseDto,
    description: 'Recomendaciones devueltas exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Recommendations not yet available for this submission',
  })
  async getRecommendations(
    @Param('id') id: string,
  ): Promise<RecommendationResponseDto> {
    return await this.generateRecommendationUseCase.execute(id);
  }
}
