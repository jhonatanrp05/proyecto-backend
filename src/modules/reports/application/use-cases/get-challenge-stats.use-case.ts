import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class GetChallengeStatsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(challengeId: string, professorId: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: {
        course: {
          select: {
            professorId: true,
          },
        },
      },
    });

    if (!challenge) {
      throw new NotFoundException(`Challenge ${challengeId} not found`);
    }

    if (challenge.course.professorId !== professorId) {
      throw new ForbiddenException(
        'No tienes permisos para consultar estadísticas de este reto',
      );
    }

    const [total, accepted, avgTime] = await Promise.all([
      this.prisma.submission.count({ where: { challengeId } }),
      this.prisma.submission.count({
        where: { challengeId, status: 'ACCEPTED' },
      }),
      this.prisma.submissionResult.aggregate({
        // ← submissionResult, no submissionResults
        where: { submission: { challengeId } },
        _avg: { executionTimeMs: true },
      }),
    ]);

    return {
      challengeId,
      totalAttempts: total,
      accepted,
      successRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
      avgExecutionTimeMs: Math.round(avgTime._avg.executionTimeMs ?? 0),
    };
  }
}
