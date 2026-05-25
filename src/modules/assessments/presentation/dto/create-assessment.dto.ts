import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, IsOptional, IsDateString, 
  IsInt, IsBoolean, IsArray, IsUUID, Min 
} from 'class-validator';

export class CreateAssessmentDto {
  @ApiProperty({ example: 'Parcial 1 SQL' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Evaluación sobre joins y subconsultas', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-05-15T08:00:00Z' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-05-15T10:00:00Z' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ example: 120 })
  @IsInt()
  @Min(1)
  duration!: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  maxAttempts!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  visibility!: boolean;

  @ApiProperty({ example: 'course-123' })
  @IsUUID()
  courseId!: string;

  @ApiProperty({ example: ['challenge-1', 'challenge-2'] })
  @IsArray()
  @IsUUID('all', { each: true })
  challengeIds!: string[];
}