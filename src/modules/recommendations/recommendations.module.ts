import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma';
import { RecommendationsController } from './presentation/recommendations.controller';
import { GenerateRecommendationUseCase } from './application/use-cases/generate-recommendation.use-case';
import { PrismaRecommendationRepository } from './infrastructure/persistence/recommendation.prisma-repository';
import { RECOMMENDATION_REPOSITORY } from './domain/repositories/recommendation.repository.interface';

// El API solo expone (lectura) la recomendación que produjo el worker con Gemini.
// El productor (AiRecommendationService) vive en el worker module.
@Module({
  imports: [PrismaModule],
  controllers: [RecommendationsController],
  providers: [
    GenerateRecommendationUseCase,
    {
      provide: RECOMMENDATION_REPOSITORY,
      useClass: PrismaRecommendationRepository,
    },
  ],
})
export class RecommendationsModule {}
