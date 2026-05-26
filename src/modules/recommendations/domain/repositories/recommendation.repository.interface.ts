import { Recommendation } from '../entities/recommendation.entity';

export const RECOMMENDATION_REPOSITORY = Symbol('RECOMMENDATION_REPOSITORY');

export interface IRecommendationRepository {
  findBySubmissionId(submissionId: string): Promise<Recommendation | null>;
  save(recommendation: Recommendation): Promise<Recommendation>;
}
