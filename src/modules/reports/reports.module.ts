import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { GetCourseReportUseCase } from './application/use-cases/get-course-report.use-case';
import { GetStudentReportUseCase } from './application/use-cases/get-student-report.use-case';
import { GetChallengeStatsUseCase } from './application/use-cases/get-challenge-stats.use-case';
import { GetLeaderboardUseCase } from './application/use-cases/get-leaderboard.use-case';
import { ReportsController } from './presentation/reports.controller';

@Module({
  controllers: [ReportsController],
  providers: [
    PrismaService,
    GetCourseReportUseCase,
    GetStudentReportUseCase,
    GetChallengeStatsUseCase,
    GetLeaderboardUseCase,
  ],
})
export class ReportsModule {}