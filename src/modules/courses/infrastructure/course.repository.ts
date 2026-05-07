import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma';
import { ICourseRepository } from '../domain/course.repository.interface';

const COURSE_SELECT = {
  id: true,
  name: true,
  code: true,
  period: true,
  group: true,
  professorId: true,
  createdAt: true,
  updatedAt: true,
  professor: { select: { id: true, name: true, email: true } },
  students: {
    select: {
      student: { select: { id: true, name: true, email: true } },
      enrolledAt: true,
    },
  },
};

@Injectable()
export class CourseRepository implements ICourseRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.course.findMany({ select: COURSE_SELECT });
  }

  findById(id: string) {
    return this.prisma.course.findUnique({
      where: { id },
      select: COURSE_SELECT,
    });
  }

  findByProfessor(professorId: string) {
    return this.prisma.course.findMany({
      where: { professorId },
      select: COURSE_SELECT,
    });
  }

  create(data: {
    name: string;
    code: string;
    period: string;
    group: string;
    professorId: string;
  }) {
    return this.prisma.course.create({ data, select: COURSE_SELECT });
  }

  update(
    id: string,
    data: Partial<{
      name: string;
      code: string;
      period: string;
      group: string;
    }>,
  ) {
    return this.prisma.course.update({
      where: { id },
      data,
      select: COURSE_SELECT,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.course.delete({ where: { id } });
  }

  async enrollStudent(courseId: string, studentId: string): Promise<void> {
    await this.prisma.courseStudent.create({ data: { courseId, studentId } });
  }

  async unenrollStudent(courseId: string, studentId: string): Promise<void> {
    await this.prisma.courseStudent.delete({
      where: { courseId_studentId: { courseId, studentId } },
    });
  }

  async isStudentEnrolled(
    courseId: string,
    studentId: string,
  ): Promise<boolean> {
    const record = await this.prisma.courseStudent.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
    });
    return !!record;
  }
}
