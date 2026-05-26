import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class GetStudentReportUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(studentId: string) {
  const submissions = await this.prisma.submission.findMany({
    where: { studentId },
    include: {
      result: true,          
      challenge: {
        select: { id: true, title: true, difficulty: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return submissions.map(s => ({
    submissionId:    s.id,
    challenge:       s.challenge,
    status:          s.status,
    score:           s.result?.score           ?? null,
    executionTimeMs: s.result?.executionTimeMs  ?? null,
    createdAt:       s.createdAt,
  }));
}
}