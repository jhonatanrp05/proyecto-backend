import { RecommendationModel as Recommendation } from 'generated/prisma/models';

export const RECOMMENDATION_REPOSITORY = 'RECOMMENDATION_REPOSITORY';

export interface IRecommendationRepository {
  create(data: {
    submissionId: string;
    explanation: string;
    suggestions: string[];
    indexSuggestions: string[];
    rewrittenQuery?: string;
  }): Promise<Recommendation>;

  findBySubmissionId(submissionId: string): Promise<Recommendation | null>;
}
