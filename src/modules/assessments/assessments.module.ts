import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma';
import { AssessmentsController } from './presentation/assessments.controller';
import { AssessmentsService } from './application/assessments.service';
import { AssessmentsRepository } from './infrastructure/assessments.repository';

@Module({
  imports: [PrismaModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService, AssessmentsRepository],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
