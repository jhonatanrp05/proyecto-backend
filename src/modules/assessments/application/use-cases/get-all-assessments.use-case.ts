import { Injectable } from '@nestjs/common';
import { AssessmentRepository } from '../../domain/repositories/assesment.repository';

@Injectable()
export class GetAllAssessmentsUseCase {
  constructor(private readonly repo: AssessmentRepository) {}

  execute() {
    return this.repo.findAll();
  }
}
