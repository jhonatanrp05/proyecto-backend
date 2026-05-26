import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { IRecommendationRepository, RECOMMENDATION_REPOSITORY } from '../../domain/repositories/recommendation.repository.interface';
import { SqlAnalyzerService } from '../services/sql-analyzer.service';
import { AiRecommendationService } from '../../infrastructure/services/ai-recommendation.service';
import { Recommendation } from '../../domain/entities/recommendation.entity';
import { RecommendationResponseDto } from '../../presentation/dto/recommendation-response.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class GenerateRecommendationUseCase {
  constructor(
    @Inject(RECOMMENDATION_REPOSITORY)
    private readonly recommendationRepository: IRecommendationRepository,
    private readonly sqlAnalyzer: SqlAnalyzerService,
    private readonly aiService: AiRecommendationService,
    private readonly prisma: PrismaService
  ) {}

  async execute(submissionId: string): Promise<RecommendationResponseDto> {
    // 1. Verificar si ya existe la recomendación en BD
    const existing = await this.recommendationRepository.findBySubmissionId(submissionId);
    if (existing) {
      return this.mapToDto(existing);
    }

    // 2. Obtener la Submission y el Challenge de la BD
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        challenge: {
          include: {
            schema: true,
          }
        },
        result: true,
      }
    });

    if (!submission) {
      throw new NotFoundException(`La submission con ID ${submissionId} no existe.`);
    }

    const query = submission.query;
    const schemaDdl = submission.challenge.schema?.ddlScript || '';
    const executionTimeMs = submission.result?.executionTimeMs || 0;

    // 3. Ejecutar SqlAnalyzerService
    const staticIssues = this.sqlAnalyzer.analyze(query);

    // 4. Ejecutar AiRecommendationService
    const aiFeedback = await this.aiService.generateFeedback(
      query,
      schemaDdl,
      executionTimeMs,
      staticIssues
    );

    // 5. Guardar en BD
    const newRecommendation = new Recommendation(
      randomUUID(),
      submissionId,
      aiFeedback.explanation,
      aiFeedback.suggestions,
      aiFeedback.indexSuggestions,
      aiFeedback.rewrittenQuery,
      new Date()
    );

    const saved = await this.recommendationRepository.save(newRecommendation);

    // 6. Retornar el resultado mapeado
    return this.mapToDto(saved);
  }

  private mapToDto(recommendation: Recommendation): RecommendationResponseDto {
    return {
      id: recommendation.id,
      submissionId: recommendation.submissionId,
      explanation: recommendation.explanation,
      suggestions: recommendation.suggestions,
      indexSuggestions: recommendation.indexSuggestions,
      rewrittenQuery: recommendation.rewrittenQuery ?? undefined,
      createdAt: recommendation.createdAt ?? new Date(),
    };
  }
}
