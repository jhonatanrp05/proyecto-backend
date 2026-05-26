import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma';
import { RecommendationsController } from './presentation/recommendations.controller';
import { SqlAnalyzerService } from './application/services/sql-analyzer.service';
import { AiRecommendationService } from './infrastructure/services/ai-recommendation.service';
import { GenerateRecommendationUseCase } from './application/use-cases/generate-recommendation.use-case';
import { PrismaRecommendationRepository } from './infrastructure/persistence/recommendation.prisma-repository';
import { RECOMMENDATION_REPOSITORY } from './domain/repositories/recommendation.repository.interface';

@Module({
  imports: [PrismaModule],
  controllers: [RecommendationsController],
  providers: [
    SqlAnalyzerService,
    AiRecommendationService,
    GenerateRecommendationUseCase,
    {
      provide: RECOMMENDATION_REPOSITORY,
      useClass: PrismaRecommendationRepository,
    },
  ],
})
export class RecommendationsModule {}
