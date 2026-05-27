import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class PreviewSubmissionDto {
  @ApiProperty({
    description: 'ID del reto contra cuyo sandbox se ejecutará la consulta',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID('all')
  @IsNotEmpty()
  challengeId: string;

  @ApiProperty({
    description: 'Consulta SQL a ejecutar en modo preview (no se persiste)',
    example: 'SELECT * FROM customers LIMIT 10;',
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({
    description: 'Motor de base de datos. Por defecto postgresql.',
    example: 'postgresql',
  })
  @IsString()
  @IsOptional()
  engine?: string;
}
