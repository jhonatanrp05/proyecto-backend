import { Module } from '@nestjs/common';
import { AssessmentsController } from './presentation/assessments.controller';

@Module({
  controllers: [AssessmentsController],
})
export class AssessmentsModule {}