import { Injectable } from '@nestjs/common';
import { AssessmentRepository } from '../../domain/repositories/assesment.repository';
import { CreateAssessmentDto } from '../../presentation/dto/create-assessment.dto';

@Injectable()
export class CreateAssessmentUseCase {
  constructor(private readonly repo: AssessmentRepository) {}

  execute(data: CreateAssessmentDto) {
    return this.repo.save({
      ...data,
      startDate: new Date(data.startDate), // ← conversión aquí, no en el tipo
      endDate: new Date(data.endDate),
    });
  }
}
