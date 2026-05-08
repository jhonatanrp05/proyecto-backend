import { Module } from '@nestjs/common';
import { SubmissionsController } from './presentation/submissions.controller';

@Module({
  controllers: [SubmissionsController],
})
export class SubmissionsModule {}