import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import {
  ICourseRepository,
  COURSE_REPOSITORY,
} from '../domain/course.repository.interface';
import { CreateCourseDto } from './dtos/create-course.dto';
import { UpdateCourseDto } from './dtos/update-course.dto';
import { PrismaService } from '../../../shared/prisma';

@Injectable()
export class CoursesService {
  constructor(
    @Inject(COURSE_REPOSITORY)
    private readonly courseRepository: ICourseRepository,
    private readonly prisma: PrismaService,
  ) {}

  findAll() {
    return this.courseRepository.findAll();
  }

  async findById(id: string) {
    const course = await this.courseRepository.findById(id);
    if (!course) throw new NotFoundException(`Course ${id} not found`);
    return course;
  }

  create(dto: CreateCourseDto, professorId: string) {
    return this.courseRepository.create({ ...dto, professorId });
  }

  async update(
    id: string,
    dto: UpdateCourseDto,
    requesterId: string,
    requesterRole: string,
  ) {
    const course = await this.findById(id);
    if (requesterRole !== 'ADMIN' && course.professorId !== requesterId) {
      throw new ForbiddenException('You can only update your own courses');
    }
    return this.courseRepository.update(id, dto);
  }

  async delete(id: string, requesterId: string, requesterRole: string) {
    const course = await this.findById(id);
    if (requesterRole !== 'ADMIN' && course.professorId !== requesterId) {
      throw new ForbiddenException('You can only delete your own courses');
    }
    return this.courseRepository.delete(id);
  }

  async enrollStudent(
    courseId: string,
    studentId: string,
    requesterId: string,
  ) {
    const course = await this.findById(courseId);
    if (course.professorId !== requesterId) {
      throw new ForbiddenException(
        'Only the course professor can enroll students',
      );
    }
    const already = await this.courseRepository.isStudentEnrolled(
      courseId,
      studentId,
    );
    if (already)
      throw new ConflictException('Student already enrolled in this course');
    return this.courseRepository.enrollStudent(courseId, studentId);
  }

  async unenrollStudent(
    courseId: string,
    studentId: string,
    requesterId: string,
  ) {
    const course = await this.findById(courseId);
    if (course.professorId !== requesterId) {
      throw new ForbiddenException(
        'Only the course professor can unenroll students',
      );
    }
    return this.courseRepository.unenrollStudent(courseId, studentId);
  }

  async getCourseReport(courseId: string) {
    const course = await this.findById(courseId);

    const enrollments = await this.prisma.courseStudent.findMany({
      where: { courseId },
      include: { student: { select: { id: true, name: true, email: true } } },
    });

    const challengeIds = await this.prisma.challenge.findMany({
      where: { courseId },
      select: { id: true, title: true },
    });

    const reportByStudent = await Promise.all(
      enrollments.map(async (e) => {
        const submissions = await this.prisma.submission.findMany({
          where: {
            studentId: e.studentId,
            challengeId: { in: challengeIds.map((c) => c.id) },
          },
          include: { result: true },
        });
        const accepted = submissions.filter(
          (s) => s.status === 'ACCEPTED',
        ).length;
        const bestScores = challengeIds.map((ch) => {
          const subs = submissions.filter(
            (s) => s.challengeId === ch.id && s.result,
          );
          const best = subs.reduce(
            (max, s) => Math.max(max, s.result?.score ?? 0),
            0,
          );
          return { challengeId: ch.id, title: ch.title, bestScore: best };
        });
        const totalScore = bestScores.reduce((sum, c) => sum + c.bestScore, 0);
        return {
          student: e.student,
          totalScore,
          acceptedChallenges: accepted,
          totalSubmissions: submissions.length,
          challengeBreakdown: bestScores,
        };
      }),
    );

    return {
      course: { id: course.id, name: course.name },
      students: reportByStudent,
    };
  }

  async getLeaderboard(courseId: string) {
    const report = await this.getCourseReport(courseId);
    return report.students
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((s, i) => ({
        rank: i + 1,
        studentId: s.student.id,
        name: s.student.name,
        totalScore: s.totalScore,
        acceptedChallenges: s.acceptedChallenges,
      }));
  }
}
