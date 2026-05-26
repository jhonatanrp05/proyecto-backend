import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ChallengeRepository } from '../../domain/repositories/challenge.repository';
import {
  Challenge,
  ChallengeStatus,
} from '../../domain/entities/challenge.entity';

@Injectable()
export class ChangeChallengeStatusUseCase {
  constructor(private readonly challengeRepo: ChallengeRepository) {}

  async execute(
    id: string,
    newStatus: ChallengeStatus,
    professorId: string,
  ): Promise<Challenge> {
    const challenge = await this.challengeRepo.findById(id);

    if (!challenge) {
      throw new NotFoundException(`Reto con id "${id}" no encontrado.`);
    }

    if (challenge.createdBy !== professorId) {
      throw new ForbiddenException(
        'Solo el profesor que creó el reto puede cambiar su estado.',
      );
    }

    // Usamos los métodos de la entidad que ya tienen la lógica de transición
    try {
      if (newStatus === 'published') {
        if (!challenge.schema) {
          throw new Error(
            'No se puede publicar el reto sin un esquema DDL cargado.',
          );
        }

        if (!challenge.seedData) {
          throw new Error(
            'No se puede publicar el reto sin datos de prueba (seed).',
          );
        }

        if (!challenge.expectedResult) {
          throw new Error(
            'No se puede publicar el reto sin resultado esperado.',
          );
        }

        challenge.publish();
      } else if (newStatus === 'archived') challenge.archive();
      else if (newStatus === 'draft') challenge.backToDraft();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error al cambiar el estado del reto.';
      throw new BadRequestException(message);
    }

    return this.challengeRepo.updateStatus(id, newStatus);
  }
}
