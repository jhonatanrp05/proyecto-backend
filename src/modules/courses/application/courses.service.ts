import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
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

  findByStudent(studentId: string) {
    return this.courseRepository.findByStudent(studentId);
  }

  async findById(id: string) {
    const course = await this.courseRepository.findById(id);
    if (!course) throw new NotFoundException(`Course ${id} not found`);
    return course;
  }

  async create(
    dto: CreateCourseDto,
    requesterId: string,
    requesterRole: string,
  ) {
    const { professorId: dtoProfessorId, ...courseData } = dto;
    let professorId = requesterId;

    if (requesterRole === 'ADMIN') {
      if (!dtoProfessorId) {
        throw new BadRequestException('professorId is required for ADMIN');
      }
      const professor = await this.prisma.user.findUnique({
        where: { id: dtoProfessorId },
        select: { role: true },
      });
      if (!professor) {
        throw new NotFoundException(`User ${dtoProfessorId} not found`);
      }
      if (professor.role !== 'PROFESSOR') {
        throw new BadRequestException('Assigned user must be a PROFESSOR');
      }
      professorId = dtoProfessorId;
    }

    return this.courseRepository.create({ ...courseData, professorId });
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
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { role: true },
    });
    if (!student) throw new NotFoundException(`User ${studentId} not found`);
    if (student.role !== 'STUDENT') {
      throw new BadRequestException('Only STUDENT users can be enrolled');
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
}
