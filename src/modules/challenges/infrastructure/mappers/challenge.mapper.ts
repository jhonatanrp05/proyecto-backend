import { Challenge } from '../../domain/entities/challenge.entity';
import { ChallengeSchema } from '../../domain/entities/challenge-schema.entity';
import { SeedData } from '../../domain/entities/seed-data.entity';
import { ExpectedResult } from '../../domain/entities/expected-result.entity';

export class ChallengeMapper {
  static toDomain(record: any): Challenge {
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
      createdBy: record.createdBy, // el campo en DB sigue siendo createdBy
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });

    if (record.schema) {
      challenge.schema = ChallengeMapper.toSchema(record.schema);
    }

    if (record.seedData) {
      challenge.seedData = ChallengeMapper.toSeedData(record.seedData);
    }

    if (record.expectedResult) {
      challenge.expectedResult = ChallengeMapper.toExpectedResult(record.expectedResult);
    }

    return challenge;
  }

  static toSchema(record: any): ChallengeSchema {
    return new ChallengeSchema({
      id: record.id,
      challengeId: record.challengeId,
      ddlScript: record.ddlScript,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toSeedData(record: any): SeedData {
    return new SeedData({
      id: record.id,
      challengeId: record.challengeId,
      insertScript: record.insertScript,
      isGenerated: record.isGenerated,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toExpectedResult(record: any): ExpectedResult {
    return new ExpectedResult({
      id: record.id,
      challengeId: record.challengeId,
      query: record.query,
      outputJson: record.outputJson,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
