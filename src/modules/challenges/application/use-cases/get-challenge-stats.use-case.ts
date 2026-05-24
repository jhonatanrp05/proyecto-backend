import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma';

@Injectable()
export class GetChallengeStatsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(challengeId: string) {
    const submissions = await this.prisma.submission.findMany({
      where: { challengeId },
      include: { result: true },
    });

    const total = submissions.length;
    if (total === 0) {
      return {
        challengeId,
        totalSubmissions: 0,
        acceptanceRate: 0,
        avgExecutionTimeMs: 0,
        statusBreakdown: {},
      };
    }

    const statusBreakdown: Record<string, number> = {};
    let totalExecTime = 0;
    let execCount = 0;

    for (const sub of submissions) {
      statusBreakdown[sub.status] = (statusBreakdown[sub.status] ?? 0) + 1;
      if (sub.result) {
        totalExecTime += sub.result.executionTimeMs;
        execCount++;
      }
    }

    const accepted = statusBreakdown['ACCEPTED'] ?? 0;

    return {
      challengeId,
      totalSubmissions: total,
      acceptanceRate: Math.round((accepted / total) * 100),
      avgExecutionTimeMs:
        execCount > 0 ? Math.round(totalExecTime / execCount) : 0,
      statusBreakdown,
    };
  }
}
