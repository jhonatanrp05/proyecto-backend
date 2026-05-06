import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ChallengeRepository } from '../../domain/repositories/challenge.repository';
import { ChallengeSchema } from '../../domain/entities/challenge-schema.entity';
import { SeedData } from '../../domain/entities/seed-data.entity';
import { ExpectedResult } from '../../domain/entities/expected-result.entity';

// ------------------------------------------------------------------ //
//  Upload Schema DDL
// ------------------------------------------------------------------ //

@Injectable()
export class UploadSchemaUseCase {
  constructor(private readonly challengeRepo: ChallengeRepository) {}

  async execute(challengeId: string, ddlScript: string, professorId: string): Promise<ChallengeSchema> {
    const challenge = await this.challengeRepo.findById(challengeId);

    if (!challenge) {
      throw new NotFoundException(`Reto con id "${challengeId}" no encontrado.`);
    }

    if (challenge.createdBy !== professorId) {
      throw new ForbiddenException('Solo el profesor que creó el reto puede cargar el esquema.');
    }

    const tempSchema = new ChallengeSchema({ ddlScript });
    if (!tempSchema.isValid()) {
      throw new BadRequestException('El script DDL debe contener al menos un CREATE TABLE.');
    }

    return this.challengeRepo.upsertSchema(challengeId, ddlScript);
  }
}

// ------------------------------------------------------------------ //
//  Upload Seed Data (manual)
// ------------------------------------------------------------------ //

@Injectable()
export class UploadSeedDataUseCase {
  constructor(private readonly challengeRepo: ChallengeRepository) {}

  async execute(challengeId: string, insertScript: string, professorId: string): Promise<SeedData> {
    const challenge = await this.challengeRepo.findById(challengeId);

    if (!challenge) {
      throw new NotFoundException(`Reto con id "${challengeId}" no encontrado.`);
    }

    if (challenge.createdBy !== professorId) {
      throw new ForbiddenException('Solo el profesor que creó el reto puede cargar datos de prueba.');
    }

    const tempSeed = new SeedData({ insertScript });
    if (!tempSeed.isValid()) {
      throw new BadRequestException('El script debe contener al menos un INSERT INTO.');
    }

    return this.challengeRepo.upsertSeedData(challengeId, insertScript, false);
  }
}

// ------------------------------------------------------------------ //
//  Set Expected Result
// ------------------------------------------------------------------ //

@Injectable()
export class SetExpectedResultUseCase {
  constructor(private readonly challengeRepo: ChallengeRepository) {}

  async execute(
    challengeId: string,
    query: string,
    outputJson: Record<string, unknown>[],
    professorId: string,
  ): Promise<ExpectedResult> {
    const challenge = await this.challengeRepo.findById(challengeId);

    if (!challenge) {
      throw new NotFoundException(`Reto con id "${challengeId}" no encontrado.`);
    }

    if (challenge.createdBy !== professorId) {
      throw new ForbiddenException('Solo el profesor que creó el reto puede definir el resultado esperado.');
    }

    if (!outputJson || outputJson.length === 0) {
      throw new BadRequestException('El resultado esperado no puede estar vacío.');
    }

    return this.challengeRepo.upsertExpectedResult(challengeId, query, outputJson);
  }
}
