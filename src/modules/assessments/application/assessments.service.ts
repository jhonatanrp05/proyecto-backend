import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AssessmentsRepository } from '../infrastructure/assessments.repository';

@Injectable()
export class AssessmentsService {
  constructor(private readonly assessmentsRepo: AssessmentsRepository) {}

  async create(dto: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    duration: number;
    maxAttempts: number;
    visibility: boolean;
    courseId: string;
  }) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException('endDate debe ser posterior a startDate');
    }
    return this.assessmentsRepo.create({
      ...dto,
      startDate,
      endDate,
    });
  }

  async findAll(courseId?: string) {
    return this.assessmentsRepo.findAll(courseId);
  }

  async findById(id: string) {
    const assessment = await this.assessmentsRepo.findById(id);
    if (!assessment) {
      throw new NotFoundException(`Assessment ${id} no encontrado`);
    }
    return assessment;
  }

  async update(
    id: string,
    professorId: string,
    dto: {
      name?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      duration?: number;
      maxAttempts?: number;
      visibility?: boolean;
    },
  ) {
    const assessment = await this.findById(id);
    if (assessment.course.professorId !== professorId) {
      throw new ForbiddenException(
        'Solo el profesor del curso puede modificar esta evaluación',
      );
    }
    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    if (data.startDate && data.endDate && data.endDate <= data.startDate) {
      throw new BadRequestException('endDate debe ser posterior a startDate');
    }
    return this.assessmentsRepo.update(id, data);
  }

  async delete(id: string, professorId: string) {
    const assessment = await this.findById(id);
    if (assessment.course.professorId !== professorId) {
      throw new ForbiddenException(
        'Solo el profesor del curso puede eliminar esta evaluación',
      );
    }
    return this.assessmentsRepo.delete(id);
  }

  async addChallenge(assessmentId: string, challengeId: string, order: number) {
    await this.findById(assessmentId);
    return this.assessmentsRepo.addChallenge(assessmentId, challengeId, order);
  }

  async removeChallenge(assessmentId: string, challengeId: string) {
    await this.findById(assessmentId);
    return this.assessmentsRepo.removeChallenge(assessmentId, challengeId);
  }
}
