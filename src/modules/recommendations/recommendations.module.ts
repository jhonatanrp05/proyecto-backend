import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma';
import { RecommendationsController } from './presentation/recommendations.controller';
import { RecommendationsService } from './application/recommendations.service';
import { SqlAnalyzerService } from './application/sql-analyzer.service';
import { RecommendationRepository } from './infrastructure/recommendation.repository';
import { RECOMMENDATION_REPOSITORY } from './domain/recommendation.repository.interface';

@Module({
  imports: [PrismaModule],
  controllers: [RecommendationsController],
  providers: [
    RecommendationsService,
    SqlAnalyzerService,
    { provide: RECOMMENDATION_REPOSITORY, useClass: RecommendationRepository },
  ],
  exports: [RecommendationsService, SqlAnalyzerService],
})
export class RecommendationsModule {}
