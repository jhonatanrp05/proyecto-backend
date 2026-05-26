import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class GetLeaderboardUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(courseId: string, requester: { id: string; role: string }) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { professorId: true },
    });

    if (!course) {
      throw new NotFoundException(`Course ${courseId} not found`);
    }

    if (requester.role === 'PROFESSOR' && course.professorId !== requester.id) {
      throw new ForbiddenException(
        'No tienes permisos para consultar el leaderboard de este curso',
      );
    }

    if (requester.role === 'STUDENT') {
      const isEnrolled = await this.prisma.courseStudent.findUnique({
        where: {
          courseId_studentId: {
            courseId,
            studentId: requester.id,
          },
        },
      });

      if (!isEnrolled) {
        throw new ForbiddenException(
          'No estás inscrito en este curso y no puedes ver su leaderboard',
        );
      }
    }

    const results = await this.prisma.$queryRaw<any[]>`
      SELECT 
        u.id,
        u.email,
        u.name,
        ROUND(AVG(sr.score)::numeric, 2)                               AS avg_score,
        SUM(CASE WHEN s.status = 'ACCEPTED' THEN 1 ELSE 0 END)         AS accepted,
        COUNT(s.id)                                                     AS total_submissions
      FROM users u
      JOIN submissions s          ON s."studentId"    = u.id
      JOIN submission_results sr  ON sr."submissionId" = s.id
      JOIN challenges c           ON c.id              = s."challengeId"
      WHERE c."courseId" = ${courseId}
      GROUP BY u.id, u.email, u.name
      ORDER BY avg_score DESC
    `;

    return results.map((r, index) => ({
      rank: index + 1,
      studentId: r.id,
      name: r.name,
      email: r.email,
      avgScore: Number(r.avg_score),
      accepted: Number(r.accepted),
      totalSubmissions: Number(r.total_submissions),
    }));
  }
}
