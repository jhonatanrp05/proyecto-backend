import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ChallengeRepository } from '../../domain/repositories/challenge.repository';
import { Challenge } from '../../domain/entities/challenge.entity';
import { UpdateChallengeDto } from '../dtos/update-challenge.dto';

@Injectable()
export class UpdateChallengeUseCase {
  constructor(private readonly challengeRepo: ChallengeRepository) {}

  async execute(id: string, dto: UpdateChallengeDto, professorId: string): Promise<Challenge> {
    const challenge = await this.challengeRepo.findById(id);

    if (!challenge) {
      throw new NotFoundException(`Reto con id "${id}" no encontrado.`);
    }

    if (challenge.createdBy !== professorId) {
      throw new ForbiddenException('Solo el profesor que creó el reto puede modificarlo.');
    }

    if (challenge.status === 'archived') {
      throw new ForbiddenException('No se puede editar un reto archivado.');
    }

    return this.challengeRepo.update(id, dto);
  }
}
