import { Injectable, NotFoundException } from '@nestjs/common';
import { ChallengeRepository } from '../../domain/repositories/challenge.repository';
import { Challenge } from '../../domain/entities/challenge.entity';

@Injectable()
export class GetChallengesUseCase {
  constructor(private readonly challengeRepo: ChallengeRepository) {}

async execute(options: {
  courseId?: string;
  onlyPublished?: boolean;
  studentId?: string;
}): Promise<Challenge[]> {
  if (options.onlyPublished && options.studentId) {
    return this.challengeRepo.findAllForStudent(options.studentId);
  }
  return this.challengeRepo.findAll({
    courseId: options.courseId,
    onlyPublished: options.onlyPublished,
  });
}
}

@Injectable()
export class GetChallengeByIdUseCase {
  constructor(private readonly challengeRepo: ChallengeRepository) {}

async execute(id: string, onlyPublished = false, studentId?: string): Promise<Challenge> {
  const challenge = await this.challengeRepo.findById(id);

  if (!challenge) {
    throw new NotFoundException(`Reto con id "${id}" no encontrado.`);
  }

  if (onlyPublished && !challenge.isVisibleToStudents()) {
    throw new NotFoundException(`Reto con id "${id}" no encontrado.`);
  }

  if (onlyPublished && studentId) {
    const enrolled = await this.challengeRepo.isStudentEnrolled(studentId, challenge.courseId);
    if (!enrolled) {
      throw new NotFoundException(`Reto con id "${id}" no encontrado.`);
    }
  }

  return challenge;
}
}
