import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma';
import { IRecommendationRepository } from '../domain/recommendation.repository.interface';
import { RecommendationModel as Recommendation } from 'generated/prisma/models';

@Injectable()
export class RecommendationRepository implements IRecommendationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    submissionId: string;
    explanation: string;
    suggestions: string[];
    indexSuggestions: string[];
    rewrittenQuery?: string;
  }): Promise<Recommendation> {
    return this.prisma.recommendation.upsert({
      where: { submissionId: data.submissionId },
      create: data,
      update: data,
    });
  }

  async findBySubmissionId(
    submissionId: string,
  ): Promise<Recommendation | null> {
    return this.prisma.recommendation.findUnique({
      where: { submissionId },
    });
  }
}
