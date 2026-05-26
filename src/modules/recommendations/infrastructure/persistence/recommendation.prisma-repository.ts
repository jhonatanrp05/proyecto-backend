import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { IRecommendationRepository } from '../../domain/repositories/recommendation.repository.interface';
import { Recommendation } from '../../domain/entities/recommendation.entity';

@Injectable()
export class PrismaRecommendationRepository implements IRecommendationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBySubmissionId(
    submissionId: string,
  ): Promise<Recommendation | null> {
    const raw = await this.prisma.recommendation.findUnique({
      where: { submissionId },
    });

    if (!raw) return null;

    return new Recommendation(
      raw.id,
      raw.submissionId,
      raw.explanation,
      raw.suggestions,
      raw.indexSuggestions,
      raw.rewrittenQuery,
      raw.createdAt,
    );
  }

  async save(recommendation: Recommendation): Promise<Recommendation> {
    const data = {
      id: recommendation.id,
      submissionId: recommendation.submissionId,
      explanation: recommendation.explanation,
      suggestions: recommendation.suggestions || [],
      indexSuggestions: recommendation.indexSuggestions || [],
      rewrittenQuery: recommendation.rewrittenQuery,
    };

    const raw = await this.prisma.recommendation.upsert({
      where: { id: recommendation.id },
      create: data,
      update: data,
    });

    return new Recommendation(
      raw.id,
      raw.submissionId,
      raw.explanation,
      raw.suggestions,
      raw.indexSuggestions,
      raw.rewrittenQuery,
      raw.createdAt,
    );
  }
}
