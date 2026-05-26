import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma';
import {
  IRecommendationRepository,
  RECOMMENDATION_REPOSITORY,
} from '../domain/recommendation.repository.interface';
import { SqlAnalyzerService } from './sql-analyzer.service';
import { RecommendationModel as Recommendation } from 'generated/prisma/models';

@Injectable()
export class RecommendationsService {
  constructor(
    @Inject(RECOMMENDATION_REPOSITORY)
    private readonly recommendationRepo: IRecommendationRepository,
    private readonly sqlAnalyzer: SqlAnalyzerService,
    private readonly prisma: PrismaService,
  ) {}

  async generateForSubmission(submissionId: string): Promise<Recommendation> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        challenge: { include: { schema: true } },
        result: true,
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} no encontrada`);
    }

    const analysis = this.sqlAnalyzer.analyze({
      query: submission.query,
      ddlScript: submission.challenge.schema?.ddlScript ?? '',
      executionTimeMs: submission.result?.executionTimeMs ?? 0,
      timeLimitMs: submission.challenge.timeLimit,
    });

    return this.recommendationRepo.create({
      submissionId,
      explanation: analysis.explanation,
      suggestions: analysis.suggestions,
      indexSuggestions: analysis.indexSuggestions,
      rewrittenQuery: analysis.rewrittenQuery,
    });
  }

  async findBySubmissionId(submissionId: string): Promise<Recommendation> {
    const recommendation =
      await this.recommendationRepo.findBySubmissionId(submissionId);
    if (!recommendation) {
      throw new NotFoundException(
        `No hay recomendaciones para la submission ${submissionId}. Puede que aún esté siendo procesada.`,
      );
    }
    return recommendation;
  }
}
