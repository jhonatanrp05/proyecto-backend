import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service'; // ajusta el path al PrismaService de D1
import { ChallengeRepository, FindChallengesFilter } from '../../domain/repositories/challenge.repository'
import { Challenge, ChallengeStatus } from '../../domain/entities/challenge.entity';
import { ChallengeSchema } from '../../domain/entities/challenge-schema.entity';
import { SeedData } from '../../domain/entities/seed-data.entity';
import { ExpectedResult } from '../../domain/entities/expected-result.entity';

@Injectable()
export class PrismaChallengeRepository implements ChallengeRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------ //
  //  Challenge
  // ------------------------------------------------------------------ //

  async create(challenge: Challenge): Promise<Challenge> {
    const record = await this.prisma.challenge.create({
      data: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        difficulty: challenge.difficulty,
        tags: challenge.tags,
        databaseEngine: challenge.databaseEngine,
        timeLimit: challenge.timeLimit,
        status: challenge.status,
        courseId: challenge.courseId,
        createdBy: challenge.createdBy,
      },
    });
    return this.mapToChallenge(record);
  }

  async findById(id: string): Promise<Challenge | null> {
    const record = await this.prisma.challenge.findUnique({
      where: { id },
      include: {
        schema: true,
        seedData: true,
        expectedResult: true,
      },
    });
    if (!record) return null;
    return this.mapToChallenge(record);
  }

  async findAll(filter?: FindChallengesFilter): Promise<Challenge[]> {
    const records = await this.prisma.challenge.findMany({
      where: {
        ...(filter?.courseId && { courseId: filter.courseId }),
        ...(filter?.createdBy && { createdBy: filter.createdBy }),
        ...(filter?.status && { status: filter.status }),
        ...(filter?.onlyPublished && { status: 'published' }),
      },
      include: {
        schema: true,
        seedData: true,
        expectedResult: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(this.mapToChallenge);
  }

  async update(id: string, partial: Partial<Challenge>): Promise<Challenge> {
    const record = await this.prisma.challenge.update({
      where: { id },
      data: {
        ...(partial.title && { title: partial.title }),
        ...(partial.description && { description: partial.description }),
        ...(partial.difficulty && { difficulty: partial.difficulty }),
        ...(partial.tags && { tags: partial.tags }),
        ...(partial.databaseEngine && { databaseEngine: partial.databaseEngine }),
        ...(partial.timeLimit && { timeLimit: partial.timeLimit }),
      },
    });
    return this.mapToChallenge(record);
  }

  async updateStatus(id: string, status: ChallengeStatus): Promise<Challenge> {
    const record = await this.prisma.challenge.update({
      where: { id },
      data: { status },
    });
    return this.mapToChallenge(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.challenge.delete({ where: { id } });
  }

  // ------------------------------------------------------------------ //
  //  ChallengeSchema
  // ------------------------------------------------------------------ //

  async upsertSchema(challengeId: string, ddlScript: string): Promise<ChallengeSchema> {
    const record = await this.prisma.challengeSchema.upsert({
      where: { challengeId },
      update: { ddlScript },
      create: { challengeId, ddlScript },
    });
    return new ChallengeSchema({
      id: record.id,
      challengeId: record.challengeId,
      ddlScript: record.ddlScript,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  async findSchema(challengeId: string): Promise<ChallengeSchema | null> {
    const record = await this.prisma.challengeSchema.findUnique({ where: { challengeId } });
    if (!record) return null;
    return new ChallengeSchema({
      id: record.id,
      challengeId: record.challengeId,
      ddlScript: record.ddlScript,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  // ------------------------------------------------------------------ //
  //  SeedData
  // ------------------------------------------------------------------ //

  async upsertSeedData(challengeId: string, insertScript: string, isGenerated: boolean): Promise<SeedData> {
    const record = await this.prisma.seedData.upsert({
      where: { challengeId },
      update: { insertScript, isGenerated },
      create: { challengeId, insertScript, isGenerated },
    });
    return new SeedData({
      id: record.id,
      challengeId: record.challengeId,
      insertScript: record.insertScript,
      isGenerated: record.isGenerated,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  async findSeedData(challengeId: string): Promise<SeedData | null> {
    const record = await this.prisma.seedData.findUnique({ where: { challengeId } });
    if (!record) return null;
    return new SeedData({
      id: record.id,
      challengeId: record.challengeId,
      insertScript: record.insertScript,
      isGenerated: record.isGenerated,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  // ------------------------------------------------------------------ //
  //  ExpectedResult
  // ------------------------------------------------------------------ //

  async upsertExpectedResult(
    challengeId: string,
    query: string,
    outputJson: Record<string, unknown>[],
  ): Promise<ExpectedResult> {
    const record = await this.prisma.expectedResult.upsert({
      where: { challengeId },
      update: { query, outputJson: outputJson as any },
      create: { challengeId, query, outputJson: outputJson as any },
    });
    return new ExpectedResult({
      id: record.id,
      challengeId: record.challengeId,
      query: record.query,
      outputJson: record.outputJson as Record<string, unknown>[],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  async findExpectedResult(challengeId: string): Promise<ExpectedResult | null> {
    const record = await this.prisma.expectedResult.findUnique({ where: { challengeId } });
    if (!record) return null;
    return new ExpectedResult({
      id: record.id,
      challengeId: record.challengeId,
      query: record.query,
      outputJson: record.outputJson as Record<string, unknown>[],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  // ------------------------------------------------------------------ //
  //  Mapper privado
  // ------------------------------------------------------------------ //

  private mapToChallenge(record: any): Challenge {
    const challenge = new Challenge({
      id: record.id,
      title: record.title,
      description: record.description,
      difficulty: record.difficulty,
      tags: record.tags,
      databaseEngine: record.databaseEngine,
      timeLimit: record.timeLimit,
      status: record.status,
      courseId: record.courseId,
      createdBy: record.createdBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });

    if (record.schema) {
      challenge.schema = new ChallengeSchema({
        id: record.schema.id,
        challengeId: record.schema.challengeId,
        ddlScript: record.schema.ddlScript,
        createdAt: record.schema.createdAt,
        updatedAt: record.schema.updatedAt,
      });
    }

    if (record.seedData) {
      challenge.seedData = new SeedData({
        id: record.seedData.id,
        challengeId: record.seedData.challengeId,
        insertScript: record.seedData.insertScript,
        isGenerated: record.seedData.isGenerated,
        createdAt: record.seedData.createdAt,
        updatedAt: record.seedData.updatedAt,
      });
    }

    if (record.expectedResult) {
      challenge.expectedResult = new ExpectedResult({
        id: record.expectedResult.id,
        challengeId: record.expectedResult.challengeId,
        query: record.expectedResult.query,
        outputJson: record.expectedResult.outputJson,
        createdAt: record.expectedResult.createdAt,
        updatedAt: record.expectedResult.updatedAt,
      });
    }

    return challenge;
  }
}
