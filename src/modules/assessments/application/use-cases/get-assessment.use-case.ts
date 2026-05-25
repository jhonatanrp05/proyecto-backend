import { Injectable, NotFoundException } from '@nestjs/common';
import { AssessmentRepository } from '../../domain/repositories/assesment.repository';

@Injectable()
export class GetAssessmentUseCase {
  constructor(private readonly repo: AssessmentRepository) {}

  async execute(id: string) {
    const assessment = await this.repo.findById(id);
    if (!assessment) throw new NotFoundException('Evaluación no encontrada');
    return assessment;
  }
}