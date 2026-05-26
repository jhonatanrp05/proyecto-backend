import { Injectable, NotFoundException } from '@nestjs/common';
import { AssessmentRepository } from '../../domain/repositories/assesment.repository';
import { UpdateAssessmentDto } from '../../presentation/dto/update-assessment.dto';

@Injectable()
export class UpdateAssessmentUseCase {
  constructor(private readonly repo: AssessmentRepository) {}

  async execute(id: string, data: UpdateAssessmentDto) {
    const exists = await this.repo.findById(id);
    if (!exists) throw new NotFoundException('Evaluación no encontrada');
    return this.repo.update(id, {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    });
  }
}
