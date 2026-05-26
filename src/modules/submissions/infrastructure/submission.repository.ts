import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma';
import { ISubmissionRepository } from '../domain/submission.repository.interface';

@Injectable()
export class SubmissionRepository implements ISubmissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    studentId: string;
    challengeId: string;
    query: string;
    engine: string;
  }): Promise<any> {
    return this.prisma.submission.create({
      data: {
        studentId: data.studentId,
        challengeId: data.challengeId,
        query: data.query,
        engine: data.engine,
      },
    });
  }

  async findById(id: string): Promise<any | null> {
    return this.prisma.submission.findUnique({
      where: { id },
      include: {
        result: true,
        challenge: {
          select: {
            id: true,
            courseId: true,
            course: {
              select: {
                professorId: true,
              },
            },
          },
        },
      },
    });
  }

  async findMany(filter: {
    studentId?: string;
    challengeId?: string;
    professorId?: string;
  }): Promise<any[]> {
    return this.prisma.submission.findMany({
      where: {
        ...(filter.studentId ? { studentId: filter.studentId } : {}),
        ...(filter.challengeId ? { challengeId: filter.challengeId } : {}),
        ...(filter.professorId
          ? { challenge: { course: { professorId: filter.professorId } } }
          : {}),
      },
      include: {
        result: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
