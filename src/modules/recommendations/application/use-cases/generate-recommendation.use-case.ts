import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  IRecommendationRepository,
  RECOMMENDATION_REPOSITORY,
} from '../../domain/repositories/recommendation.repository.interface';
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
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    submissionId: string,
    requester?: { id: string; role: string },
  ): Promise<RecommendationResponseDto> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        challenge: {
          include: {
            schema: true,
            course: {
              select: {
                professorId: true,
              },
            },
          },
        },
        result: true,
      },
    });

    if (!submission) {
      throw new NotFoundException(
        `La submission con ID ${submissionId} no existe.`,
      );
    }

    if (requester) {
      this.assertAccess(submission, requester);
    }

    const existing =
      await this.recommendationRepository.findBySubmissionId(submissionId);
    if (existing) {
      return this.mapToDto(existing);
    }

    const query = submission.query;
    const schemaDdl = submission.challenge.schema?.ddlScript || '';
    const executionTimeMs = submission.result?.executionTimeMs || 0;

    // 3. Ejecutar SqlAnalyzerService
    const staticIssues = this.sqlAnalyzer.analyze(query, schemaDdl);

    // 4. Ejecutar AiRecommendationService
    const aiFeedback = await this.aiService.generateFeedback(
      query,
      schemaDdl,
      executionTimeMs,
      staticIssues,
    );

    // 5. Guardar en BD
    const newRecommendation = new Recommendation(
      randomUUID(),
      submissionId,
      aiFeedback.explanation,
      aiFeedback.suggestions,
      aiFeedback.indexSuggestions,
      aiFeedback.rewrittenQuery,
      new Date(),
    );

    const saved = await this.recommendationRepository.save(newRecommendation);

    // 6. Retornar el resultado mapeado
    return this.mapToDto(saved);
  }

  private assertAccess(
    submission: {
      studentId: string;
      challenge: { course: { professorId: string } };
    },
    requester: { id: string; role: string },
  ) {
    if (requester.role === 'ADMIN') return;

    if (requester.role === 'STUDENT' && submission.studentId !== requester.id) {
      throw new ForbiddenException(
        'No tienes permisos para ver estas recomendaciones',
      );
    }

    if (
      requester.role === 'PROFESSOR' &&
      submission.challenge.course.professorId !== requester.id
    ) {
      throw new ForbiddenException(
        'No tienes permisos para ver estas recomendaciones',
      );
    }
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
