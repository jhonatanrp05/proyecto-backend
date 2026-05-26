import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../shared/prisma';
import {
  SubmissionsService,
  SUBMISSIONS_QUEUE,
} from './application/submissions.service';
import { SubmissionsController } from './presentation/submissions.controller';
import { SubmissionRepository } from './infrastructure/submission.repository';
import { SUBMISSION_REPOSITORY } from './domain/submission.repository.interface';

@Module({
  imports: [
    PrismaModule,

    BullModule.registerQueue({
      name: SUBMISSIONS_QUEUE,
    }),
  ],
  controllers: [SubmissionsController],
  providers: [
    SubmissionsService,
    { provide: SUBMISSION_REPOSITORY, useClass: SubmissionRepository },
  ],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
