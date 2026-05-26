// modules/assessments/domain/assessment.entity.ts
export class Assessment {
  id!: string;
  name!: string;
  description?: string | null;
  startDate!: Date;
  endDate!: Date;
  duration!: number;
  maxAttempts!: number;
  visibility!: boolean;
  courseId!: string;
  challengeIds!: string[];
  createdAt!: Date;
  updatedAt!: Date;
}
