import { ChallengeSchema } from './challenge-schema.entity';
import { SeedData } from './seed-data.entity';
import { ExpectedResult } from './expected-result.entity';

export type ChallengeStatus = 'draft' | 'published' | 'archived';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export class Challenge {
  id!: string;
  title!: string;
  description!: string;
  difficulty!: string;
  tags!: string[];
  databaseEngine!: string;
  timeLimit!: number;
  status!: ChallengeStatus;
  courseId!: string;
  createdBy!: string;
  createdAt!: Date;
  updatedAt!: Date;

  schema?: ChallengeSchema;
  seedData?: SeedData;
  expectedResult?: ExpectedResult;

  constructor(partial: Partial<Challenge>) {
    Object.assign(this, partial);
  }

  publish(): void {
    if (this.status !== 'draft') {
      throw new Error(
        `No se puede publicar un reto en estado "${this.status}". Solo se pueden publicar retos en estado "draft".`,
      );
    }
    this.status = 'published';
    this.updatedAt = new Date();
  }

  archive(): void {
    if (this.status === 'archived') {
      throw new Error('El reto ya está archivado.');
    }
    this.status = 'archived';
    this.updatedAt = new Date();
  }

  backToDraft(): void {
    if (this.status !== 'published') {
      throw new Error(
        `Solo se puede volver a draft desde "published". Estado actual: "${this.status}".`,
      );
    }
    this.status = 'draft';
    this.updatedAt = new Date();
  }

  isVisibleToStudents(): boolean {
    return this.status === 'published';
  }
}
