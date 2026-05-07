export interface ISubmissionRepository {
  create(data: {
    studentId: string;
    challengeId: string;
    query: string;
    engine: string;
  }): Promise<any>;

  findById(id: string): Promise<any | null>;
}

export const SUBMISSION_REPOSITORY = Symbol('SUBMISSION_REPOSITORY');
