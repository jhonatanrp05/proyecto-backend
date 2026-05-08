import { Module } from '@nestjs/common';
import { ChallengesController } from './presentation/challenges.controller';

@Module({
  controllers: [ChallengesController],
})
export class ChallengesModule {}