import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class GetCourseReportUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(courseId: string) {
    const results = await this.prisma.$queryRaw<any[]>`
      SELECT 
        u.id,
        u.email,
        u.name,
        ROUND(AVG(sr.score)::numeric, 2)                               AS avg_score,
        COUNT(s.id)                                                     AS total_submissions,
        SUM(CASE WHEN s.status = 'ACCEPTED' THEN 1 ELSE 0 END)         AS accepted
      FROM users u
      JOIN submissions s          ON s.student_id    = u.id
      JOIN submission_results sr  ON sr.submission_id = s.id
      JOIN challenges c           ON c.id             = s.challenge_id
      WHERE c.course_id = ${courseId}
      GROUP BY u.id, u.email, u.name
      ORDER BY avg_score DESC
    `;

    return results.map((r) => ({
      studentId: r.id,
      name: r.name,
      email: r.email,
      avgScore: Number(r.avg_score),
      totalSubmissions: Number(r.total_submissions),
      accepted: Number(r.accepted),
    }));
  }
}
