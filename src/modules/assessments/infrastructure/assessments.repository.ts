import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma';

export interface CreateAssessmentData {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  maxAttempts: number;
  visibility: boolean;
  courseId: string;
}

export interface UpdateAssessmentData {
  name?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  duration?: number;
  maxAttempts?: number;
  visibility?: boolean;
}

@Injectable()
export class AssessmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAssessmentData) {
    return this.prisma.assessment.create({
      data,
      include: { challenges: { include: { challenge: true } }, course: true },
    });
  }

  async findAll(courseId?: string) {
    return this.prisma.assessment.findMany({
      where: courseId ? { courseId } : undefined,
      include: { challenges: { include: { challenge: true } }, course: true },
      orderBy: { startDate: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.assessment.findUnique({
      where: { id },
      include: {
        challenges: { include: { challenge: true }, orderBy: { order: 'asc' } },
        course: true,
        attempts: true,
      },
    });
  }

  async update(id: string, data: UpdateAssessmentData) {
    return this.prisma.assessment.update({
      where: { id },
      data,
      include: { challenges: { include: { challenge: true } }, course: true },
    });
  }

  async delete(id: string) {
    return this.prisma.assessment.delete({ where: { id } });
  }

  async addChallenge(assessmentId: string, challengeId: string, order: number) {
    return this.prisma.assessmentChallenge.upsert({
      where: { assessmentId_challengeId: { assessmentId, challengeId } },
      create: { assessmentId, challengeId, order },
      update: { order },
    });
  }

  async removeChallenge(assessmentId: string, challengeId: string) {
    return this.prisma.assessmentChallenge.delete({
      where: { assessmentId_challengeId: { assessmentId, challengeId } },
    });
  }
}
