import { Module } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service'; 
import { AssessmentRepository } from './domain/repositories/assesment.repository';
import { AssessmentPrismaRepository } from './infrastructure/persistence/assessment.prisma-repository';

import { CreateAssessmentUseCase } from './application/use-cases/create-assessment.use-case';
import { GetAssessmentUseCase } from './application/use-cases/get-assessment.use-case';
import { GetAllAssessmentsUseCase } from './application/use-cases/get-all-assessments.use-case';
import { UpdateAssessmentUseCase } from './application/use-cases/update-assessment.use-case';
import { ValidateSubmissionUseCase } from './application/use-cases/validate-submission.use-case';




import { AssessmentsController } from './presentation/assessments.controller';

@Module({
  controllers: [AssessmentsController],
  providers: [
    PrismaService,
    { provide: AssessmentRepository, useClass: AssessmentPrismaRepository },
    CreateAssessmentUseCase,
    GetAssessmentUseCase,
    GetAllAssessmentsUseCase,
    UpdateAssessmentUseCase,
    ValidateSubmissionUseCase,
  ],
  exports: [ValidateSubmissionUseCase],
})
export class AssessmentsModule {}