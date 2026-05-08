import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { ChallengeRepository, FindChallengesFilter } from '../../domain/repositories/challenge.repository';
import { Challenge, ChallengeStatus } from '../../domain/entities/challenge.entity';
import { ChallengeSchema } from '../../domain/entities/challenge-schema.entity';
import { SeedData } from '../../domain/entities/seed-data.entity';
import { ExpectedResult } from '../../domain/entities/expected-result.entity';
import { ChallengeMapper } from '../mappers/challenge.mapper';

@Injectable()
export class PrismaChallengeRepository implements ChallengeRepository {
  constructor(private readonly prisma: PrismaService) {}


  //  Challenge


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
    return ChallengeMapper.toDomain(record);
  }

  async findById(id: string): Promise<Challenge | null> {
    const record = await this.prisma.challenge.findUnique({
      where: { id },
      include: { schema: true, seedData: true, expectedResult: true },
    });
    if (!record) return null;
    return ChallengeMapper.toDomain(record);
  }

  async findAll(filter?: FindChallengesFilter): Promise<Challenge[]> {
    const records = await this.prisma.challenge.findMany({
      where: {
        ...(filter?.courseId && { courseId: filter.courseId }),
        ...(filter?.createdBy && { createdBy: filter.createdBy }),
        ...(filter?.status && { status: filter.status }),
        ...(filter?.onlyPublished && { status: 'published' }),
      },
      include: { schema: true, seedData: true, expectedResult: true },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(ChallengeMapper.toDomain);
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
    return ChallengeMapper.toDomain(record);
  }

  async updateStatus(id: string, status: ChallengeStatus): Promise<Challenge> {
    const record = await this.prisma.challenge.update({
      where: { id },
      data: { status },
    });
    return ChallengeMapper.toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.challenge.delete({ where: { id } });
  }


  //  ChallengeSchema


  async upsertSchema(challengeId: string, ddlScript: string): Promise<ChallengeSchema> {
    const record = await this.prisma.challengeSchema.upsert({
      where: { challengeId },
      update: { ddlScript },
      create: { challengeId, ddlScript },
    });
    return ChallengeMapper.toSchema(record);
  }

  async findSchema(challengeId: string): Promise<ChallengeSchema | null> {
    const record = await this.prisma.challengeSchema.findUnique({ where: { challengeId } });
    if (!record) return null;
    return ChallengeMapper.toSchema(record);
  }


  //  SeedData


  async upsertSeedData(challengeId: string, insertScript: string, isGenerated: boolean): Promise<SeedData> {
    const record = await this.prisma.seedData.upsert({
      where: { challengeId },
      update: { insertScript, isGenerated },
      create: { challengeId, insertScript, isGenerated },
    });
    return ChallengeMapper.toSeedData(record);
  }

  async findSeedData(challengeId: string): Promise<SeedData | null> {
    const record = await this.prisma.seedData.findUnique({ where: { challengeId } });
    if (!record) return null;
    return ChallengeMapper.toSeedData(record);
  }


  //  ExpectedResult


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
    return ChallengeMapper.toExpectedResult(record);
  }

  async findExpectedResult(challengeId: string): Promise<ExpectedResult | null> {
    const record = await this.prisma.expectedResult.findUnique({ where: { challengeId } });
    if (!record) return null;
    return ChallengeMapper.toExpectedResult(record);
  }
}
