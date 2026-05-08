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
      },
    });
  }
}
