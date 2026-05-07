import { ApiProperty } from '@nestjs/swagger';

export class CreateAssessmentDto {

  @ApiProperty({
    example: 'Parcial 1 SQL',
    description: 'Nombre de la evaluación'
  })
  name: string;

  @ApiProperty({
    example: 'Evaluación sobre joins, group by y subconsultas',
    description: 'Descripción de la evaluación'
  })
  description: string;

  @ApiProperty({
    example: '2026-05-15T08:00:00Z',
    description: 'Fecha de inicio'
  })
  startDate: string;

  @ApiProperty({
    example: '2026-05-15T10:00:00Z',
    description: 'Fecha de finalización'
  })
  endDate: string;

  @ApiProperty({
    example: 120,
    description: 'Duración en minutos'
  })
  duration: number;

  @ApiProperty({
    example: 3,
    description: 'Máximo número de intentos permitidos'
  })
  maxAttempts: number;

  @ApiProperty({
    example: true,
    description: 'Define si los resultados son visibles para estudiantes'
  })
  visibility: boolean;

  @ApiProperty({
    example: 'course-123',
    description: 'ID del curso asociado'
  })
  courseId: string;

  @ApiProperty({
    example: ['challenge-1', 'challenge-2'],
    description: 'Lista de retos asociados'
  })
  challengeIds: string[];
}