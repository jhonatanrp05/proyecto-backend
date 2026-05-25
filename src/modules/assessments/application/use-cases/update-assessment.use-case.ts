import { Injectable, NotFoundException } from '@nestjs/common';
import { AssessmentRepository } from '../../domain/repositories/assesment.repository';

@Injectable()
export class UpdateAssessmentUseCase {
  constructor(private readonly repo: AssessmentRepository) {}

  async execute(id: string, data: Partial<{
    name: string; description: string; startDate: Date; endDate: Date;
    duration: number; maxAttempts: number; challengeIds: string[]; visibility: boolean;
  }>) {
    const exists = await this.repo.findById(id);
    if (!exists) throw new NotFoundException('Evaluación no encontrada');
    return this.repo.update(id, data);
  }
}