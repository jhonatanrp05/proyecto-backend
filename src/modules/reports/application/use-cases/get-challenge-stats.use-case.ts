import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class GetChallengeStatsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(challengeId: string) {
  const [total, accepted, avgTime] = await Promise.all([
    this.prisma.submission.count({ where: { challengeId } }),
    this.prisma.submission.count({ where: { challengeId, status: 'ACCEPTED' } }),
    this.prisma.submissionResult.aggregate({  // ← submissionResult, no submissionResults
      where: { submission: { challengeId } },
      _avg: { executionTimeMs: true },
    }),
  ]);

  return {
    challengeId,
    totalAttempts:      total,
    accepted,
    successRate:        total > 0 ? Math.round((accepted / total) * 100) : 0,
    avgExecutionTimeMs: Math.round(avgTime._avg.executionTimeMs ?? 0),
  };
}
}