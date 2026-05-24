import { Module } from '@nestjs/common';

// Presentation
import { ChallengesController } from './presentation/challenges.controller';

// Use cases
import { CreateChallengeUseCase } from './application/use-cases/create-challenge.use-case';
import {
  GetChallengesUseCase,
  GetChallengeByIdUseCase,
} from './application/use-cases/get-challenges.use-case';
import { UpdateChallengeUseCase } from './application/use-cases/update-challenge.use-case';
import { ChangeChallengeStatusUseCase } from './application/use-cases/change-challenge-status.use-case';
import {
  UploadSchemaUseCase,
  UploadSeedDataUseCase,
  SetExpectedResultUseCase,
} from './application/use-cases/challenge-content.use-case';
import { GetChallengeStatsUseCase } from './application/use-cases/get-challenge-stats.use-case';
import { GenerateDataUseCase } from './application/use-cases/generate-data.use-case';

// Repository
import { ChallengeRepository } from './domain/repositories/challenge.repository';
import { PrismaChallengeRepository } from './infrastructure/persistence/prisma-challenge.repository';

import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChallengesController],
  providers: [
    // Binding: cuando alguien inyecte ChallengeRepository, NestJS entrega PrismaChallengeRepository
    {
      provide: ChallengeRepository,
      useClass: PrismaChallengeRepository,
    },
    // Casos de uso
    CreateChallengeUseCase,
    GetChallengesUseCase,
    GetChallengeByIdUseCase,
    UpdateChallengeUseCase,
    ChangeChallengeStatusUseCase,
    UploadSchemaUseCase,
    UploadSeedDataUseCase,
    SetExpectedResultUseCase,
    GenerateDataUseCase,
    GetChallengeStatsUseCase,
  ],

  exports: [ChallengeRepository],
})
export class ChallengesModule {}
