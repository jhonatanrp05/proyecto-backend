import { Injectable } from '@nestjs/common';
import { ChallengeRepository } from '../../domain/repositories/challenge.repository';
import { Challenge } from '../../domain/entities/challenge.entity';
import { CreateChallengeDto } from '../dtos/create-challenge.dto';


@Injectable()
export class CreateChallengeUseCase {
  constructor(private readonly challengeRepo: ChallengeRepository) {}

  async execute(dto: CreateChallengeDto, professorId: string): Promise<Challenge> {
    const challenge = new Challenge({
      id: crypto.randomUUID(),
      title: dto.title,
      description: dto.description,
      difficulty: dto.difficulty,
      tags: dto.tags,
      databaseEngine: dto.databaseEngine,
      timeLimit: dto.timeLimit,
      status: 'draft', // siempre empieza en draft
      courseId: dto.courseId,
      createdBy: professorId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.challengeRepo.create(challenge);
  }
}
