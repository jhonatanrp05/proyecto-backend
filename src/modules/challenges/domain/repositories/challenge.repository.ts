import { Challenge, ChallengeStatus } from '../entities/challenge.entity';
import { ChallengeSchema } from '../entities/challenge-schema.entity';
import { SeedData } from '../entities/seed-data.entity';
import { ExpectedResult } from '../entities/expected-result.entity';

export interface FindChallengesFilter {
  courseId?: string;
  status?: ChallengeStatus;
  createdBy?: string;
  onlyPublished?: boolean; // para estudiantes
}

export abstract class ChallengeRepository {
  //  Challenge 
  abstract create(challenge: Challenge): Promise<Challenge>;
  abstract findById(id: string): Promise<Challenge | null>;
  abstract findAll(filter?: FindChallengesFilter): Promise<Challenge[]>;
  abstract update(id: string, partial: Partial<Challenge>): Promise<Challenge>;
  abstract updateStatus(id: string, status: ChallengeStatus): Promise<Challenge>;
  abstract delete(id: string): Promise<void>;
  abstract findAllForStudent(studentId: string): Promise<Challenge[]>;
  abstract isStudentEnrolled(studentId: string, courseId: string): Promise<boolean>;
  // ChallengeSchema 
  abstract upsertSchema(challengeId: string, ddlScript: string): Promise<ChallengeSchema>;
  abstract findSchema(challengeId: string): Promise<ChallengeSchema | null>;

  //  SeedData 
  abstract upsertSeedData(challengeId: string, insertScript: string, isGenerated: boolean): Promise<SeedData>;
  abstract findSeedData(challengeId: string): Promise<SeedData | null>;

  //ExpectedResult 
  abstract upsertExpectedResult(challengeId: string, query: string, outputJson: Record<string, unknown>[]): Promise<ExpectedResult>;
  abstract findExpectedResult(challengeId: string): Promise<ExpectedResult | null>;
}
