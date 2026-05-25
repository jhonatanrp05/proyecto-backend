import { Assessment } from '../entities/assessment.entity';

export abstract class AssessmentRepository {
  abstract findById(id: string): Promise<Assessment | null>;
  abstract findAll(): Promise<Assessment[]>;
  abstract findByCourse(courseId: string): Promise<Assessment[]>;
  abstract save(data: Partial<Assessment>): Promise<Assessment>;
  abstract update(id: string, data: Partial<Assessment>): Promise<Assessment>;
  abstract delete(id: string): Promise<void>;
}