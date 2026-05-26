import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty({ example: 'Bases de Datos II' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'BD2-2026' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: '2026-1' })
  @IsString()
  @IsNotEmpty()
  period: string;

  @ApiProperty({ example: '1' })
  @IsString()
  @IsNotEmpty()
  group: string;

  @ApiPropertyOptional({
    example: 'uuid-of-professor',
    description: 'Required when an ADMIN creates the course on behalf of a professor',
  })
  @IsUUID()
  @IsOptional()
  professorId?: string;
}
