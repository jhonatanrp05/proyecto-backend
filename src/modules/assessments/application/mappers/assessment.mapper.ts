// src/modules/assessments/application/mappers/assessment.mapper.ts
import { Assessment } from '../../domain/entities/assessment.entity';
import { AssessmentResponseDto } from '../../presentation/dto/assessment-response.dto';

export class AssessmentMapper {
  static toResponse(assessment: Assessment): AssessmentResponseDto {
    const dto = new AssessmentResponseDto();
    dto.id = assessment.id;
    dto.name = assessment.name;
    dto.description = assessment.description ?? '';
    dto.startDate = assessment.startDate.toISOString();
    dto.endDate = assessment.endDate.toISOString();
    dto.duration = assessment.duration;
    dto.maxAttempts = assessment.maxAttempts;
    dto.visibility = assessment.visibility;
    dto.courseId = assessment.courseId;
    dto.challengeIds = assessment.challengeIds;
    dto.createdAt = assessment.createdAt.toISOString();
    return dto;
  }
}
