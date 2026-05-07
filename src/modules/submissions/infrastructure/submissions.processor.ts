import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../shared/prisma';
import { SUBMISSIONS_QUEUE } from '../application/submissions.service';

interface EvaluateJobData {
  submissionId: string;
}

@Processor(SUBMISSIONS_QUEUE)
export class SubmissionsProcessor extends WorkerHost {
  private readonly logger = new Logger(SubmissionsProcessor.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<EvaluateJobData>): Promise<void> {
    const { submissionId } = job.data;
    this.logger.log(`[STUB] Procesando submission ${submissionId}`);

    await this.prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'RUNNING' },
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: 'ACCEPTED',
        result: {
          create: {
            status: 'ACCEPTED',
            score: 100,
            executionTimeMs: 1500,
            tests: [],
          },
        },
      },
    });

    this.logger.log(`[STUB] Submission ${submissionId} marcado como ACCEPTED`);
  }
}
