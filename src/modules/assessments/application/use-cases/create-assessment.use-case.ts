import { Injectable } from '@nestjs/common';
import { AssessmentRepository } from '../../domain/repositories/assesment.repository';

@Injectable()
export class CreateAssessmentUseCase {
  constructor(private readonly repo: AssessmentRepository) {}

  execute(data: {
    name: string; description?: string; startDate: Date; endDate: Date;
    duration: number; maxAttempts: number; courseId: string;
    challengeIds: string[]; visibility?: boolean;
  }) {
    return this.repo.save(data);
  }

}