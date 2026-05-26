import { Module } from '@nestjs/common';
import { RecommendationsController } from './presentation/recommendations.controller';
import { SqlAnalyzerService } from './application/services/sql-analyzer.service';

@Module({
  controllers: [RecommendationsController],
  providers: [SqlAnalyzerService],
})
export class RecommendationsModule {}