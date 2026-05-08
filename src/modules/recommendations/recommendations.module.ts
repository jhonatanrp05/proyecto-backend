import { Module } from '@nestjs/common';
import { RecommendationsController } from './presentation/recommendations.controller';

@Module({
  controllers: [RecommendationsController, RecommendationsController ],
})
export class RecommendationsModule {}