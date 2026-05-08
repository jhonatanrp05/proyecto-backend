import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateSubmissionDto {
  @ApiProperty({
    description: 'ID del reto al que corresponde esta solución',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID('all')
  @IsNotEmpty()
  challengeId: string;

  @ApiProperty({
    description: 'La consulta SQL enviada por el estudiante',
    example: 'SELECT * FROM customers WHERE city = \'Bogotá\';',
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiProperty({
    description: 'Motor de base de datos a usar para evaluar la consulta',
    example: 'postgresql',
  })
  @IsString()
  @IsNotEmpty()
  engine: string;
}
