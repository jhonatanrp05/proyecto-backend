import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCourseDto {
  @ApiPropertyOptional({ example: 'Bases de Datos III' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'BD3-2026' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: '2026-2' })
  @IsString()
  @IsOptional()
  period?: string;

  @ApiPropertyOptional({ example: '2' })
  @IsString()
  @IsOptional()
  group?: string;
}
