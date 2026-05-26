import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { AssessmentRepository } from '../../domain/repositories/assesment.repository';

@Injectable()
export class ValidateSubmissionUseCase {
  constructor(private readonly repo: AssessmentRepository) {}

  async execute(assessmentId: string, submissionCount: number) {
    const assessment = await this.repo.findById(assessmentId);
    if (!assessment) throw new NotFoundException('Evaluación no encontrada');

    const now = new Date();
    if (now < assessment.startDate || now > assessment.endDate) {
      throw new ForbiddenException(
        'La evaluación no está activa en este momento.',
      );
    }

    if (submissionCount >= assessment.maxAttempts) {
      throw new ForbiddenException(
        'Superaste el máximo de intentos permitidos.',
      );
    }
  }
}
