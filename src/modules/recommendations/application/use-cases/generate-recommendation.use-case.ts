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
import { Recommendation } from '../../domain/entities/recommendation.entity';
import { RecommendationResponseDto } from '../../presentation/dto/recommendation-response.dto';

@Injectable()
export class GenerateRecommendationUseCase {
  constructor(
    @Inject(RECOMMENDATION_REPOSITORY)
    private readonly recommendationRepository: IRecommendationRepository,
    private readonly prisma: PrismaService,
  ) {}

  // El productor de recomendaciones es el worker (Opción 2 del enunciado: IA).
  // Este use case solo expone la recomendación ya persistida.
  async execute(
    submissionId: string,
    requester?: { id: string; role: string },
  ): Promise<RecommendationResponseDto> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        challenge: {
          select: {
            course: { select: { professorId: true } },
          },
        },
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
    if (!existing) {
      throw new NotFoundException(
        'La recomendación aún no está disponible. Espera a que termine la evaluación del submission.',
      );
    }
    return this.mapToDto(existing);
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
