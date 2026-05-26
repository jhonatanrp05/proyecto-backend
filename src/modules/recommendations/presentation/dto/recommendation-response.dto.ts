import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecommendationResponseDto {
  @ApiProperty({
    description: 'ID único de la recomendación (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'ID del submission asociado',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  submissionId: string;

  @ApiProperty({
    description: 'Explicación de la recomendación de la IA',
    example:
      'La consulta se puede optimizar agregando un índice o cambiando la estructura del JOIN.',
  })
  explanation: string;

  @ApiProperty({
    description: 'Sugerencias para optimizar la consulta',
    example: ['Usa JOIN en lugar de subconsultas', 'Filtra primero por fecha'],
  })
  suggestions: any;

  @ApiProperty({
    description: 'Sugerencias de creación de índices',
    example: ['CREATE INDEX idx_user_id ON users(id)'],
  })
  indexSuggestions: any;

  @ApiPropertyOptional({
    description: 'Consulta reescrita y optimizada por la IA',
    example: 'SELECT * FROM users u JOIN roles r ON u.role_id = r.id',
  })
  rewrittenQuery?: string;

  @ApiProperty({
    description: 'Fecha de creación de la recomendación',
  })
  createdAt: Date;
}
