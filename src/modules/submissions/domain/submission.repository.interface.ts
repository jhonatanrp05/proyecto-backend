export interface ISubmissionRepository {
  create(data: {
    studentId: string;
    challengeId: string;
    query: string;
    engine: string;
  }): Promise<any>;

  findById(id: string): Promise<any | null>;

  findMany(filter: {
    studentId?: string;
    challengeId?: string;
    professorId?: string;
  }): Promise<any[]>;
}

export const SUBMISSION_REPOSITORY = Symbol('SUBMISSION_REPOSITORY');
