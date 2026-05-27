import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class PreviewSubmissionDto {
  @ApiProperty({
    description: 'ID del reto contra el cual ejecutar la consulta',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID('all')
  @IsNotEmpty()
  challengeId: string;

  @ApiProperty({
    description: 'Consulta SQL a ejecutar en modo preview (no se califica)',
    example: "SELECT * FROM customers WHERE city = 'Bogotá';",
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({
    description: 'Motor de base de datos (informativo; el runner usa Postgres)',
    example: 'postgresql',
  })
  @IsString()
  @IsOptional()
  engine?: string;
}
