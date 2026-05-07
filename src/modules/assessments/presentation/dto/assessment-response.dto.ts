import { ApiProperty } from '@nestjs/swagger';

export class AssessmentResponseDto {

  @ApiProperty({
    example: 'assessment-123'
  })
  id: string;

  @ApiProperty({
    example: 'Parcial 1 SQL'
  })
  name: string;

  @ApiProperty({
    example: 'Evaluación sobre joins y subconsultas'
  })
  description: string;

  @ApiProperty({
    example: '2026-05-15T08:00:00Z'
  })
  startDate: string;

  @ApiProperty({
    example: '2026-05-15T10:00:00Z'
  })
  endDate: string;

  @ApiProperty({
    example: 120
  })
  duration: number;

  @ApiProperty({
    example: 3
  })
  maxAttempts: number;

  @ApiProperty({
    example: true
  })
  visibility: boolean;

  @ApiProperty({
    example: 'course-123'
  })
  courseId: string;

  @ApiProperty({
    example: ['challenge-1', 'challenge-2']
  })
  challengeIds: string[];

  @ApiProperty({
    example: '2026-05-10T12:00:00Z'
  })
  createdAt: string;
} 