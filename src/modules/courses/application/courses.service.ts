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

@Injectable()
export class CoursesService {
  constructor(
    @Inject(COURSE_REPOSITORY)
    private readonly courseRepository: ICourseRepository,
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
}
