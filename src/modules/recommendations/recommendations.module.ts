import { Module } from '@nestjs/common';
import { RecommendationsController } from './presentation/recommendations.controller';
import { SqlAnalyzerService } from './application/services/sql-analyzer.service';
import { AiRecommendationService } from './infrastructure/services/ai-recommendation.service';

@Module({
  controllers: [RecommendationsController],
  providers: [SqlAnalyzerService, AiRecommendationService],
})
export class RecommendationsModule {}