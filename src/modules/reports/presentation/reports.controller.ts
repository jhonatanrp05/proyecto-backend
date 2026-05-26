import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards';
import { Roles, CurrentUser } from '../../../shared/decorators';
import { Role } from '../../../shared/constants';
import { GetCourseReportUseCase } from '../application/use-cases/get-course-report.use-case';
import { GetStudentReportUseCase } from '../application/use-cases/get-student-report.use-case';
import { GetChallengeStatsUseCase } from '../application/use-cases/get-challenge-stats.use-case';
import { GetLeaderboardUseCase } from '../application/use-cases/get-leaderboard.use-case';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ReportsController {
  constructor(
    private readonly courseReportUseCase: GetCourseReportUseCase,
    private readonly studentReportUseCase: GetStudentReportUseCase,
    private readonly challengeStatsUseCase: GetChallengeStatsUseCase,
    private readonly leaderboardUseCase: GetLeaderboardUseCase,
  ) {}

  @Get('courses/:courseId/report')
  @Roles(Role.PROFESSOR)
  @ApiOperation({ summary: 'Course report [PROFESSOR]' })
  getCourseReport(
    @Param('courseId') courseId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.courseReportUseCase.execute(courseId, user.id);
  }

  @Get('courses/:courseId/leaderboard')
  @Roles(Role.PROFESSOR, Role.STUDENT)
  @ApiOperation({ summary: 'Course leaderboard [PROFESSOR, STUDENT]' })
  getLeaderboard(
    @Param('courseId') courseId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.leaderboardUseCase.execute(courseId, user);
  }

  @Get('students/:studentId/report')
  @Roles(Role.PROFESSOR, Role.STUDENT)
  @ApiOperation({ summary: 'Student report [PROFESSOR, STUDENT]' })
  getStudentReport(
    @Param('studentId') studentId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    if (user.role === 'STUDENT' && studentId !== user.id) {
      throw new ForbiddenException('You can only view your own report');
    }
    return this.studentReportUseCase.execute(studentId);
  }

  @Get('challenges/:challengeId/stats')
  @Roles(Role.PROFESSOR)
  @ApiOperation({ summary: 'Challenge stats [PROFESSOR]' })
  getChallengeStats(
    @Param('challengeId') challengeId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.challengeStatsUseCase.execute(challengeId, user.id);
  }
}
