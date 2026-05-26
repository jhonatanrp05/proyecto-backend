import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  IsInt,
  IsPositive,
  ArrayNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Difficulty } from '../../domain/entities/challenge.entity';

export class CreateChallengeDto {
  @ApiProperty({ example: 'Clientes con más de 3 compras' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    example: 'Escribe una query que retorne los clientes con más de 3 compras.',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ enum: ['Easy', 'Medium', 'Hard'] })
  @IsEnum(['Easy', 'Medium', 'Hard'])
  difficulty!: Difficulty;

  @ApiProperty({ example: ['SELECT', 'JOIN', 'GROUP BY'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  tags!: string[];

  @ApiProperty({ example: 'PostgreSQL' })
  @IsString()
  @IsNotEmpty()
  databaseEngine!: string;

  @ApiProperty({ example: 2000, description: 'Tiempo límite en milisegundos' })
  @IsInt()
  @IsPositive()
  timeLimit!: number;

  @ApiProperty({ example: 'curso-uuid-aqui' })
  @IsString()
  @IsNotEmpty()
  courseId!: string;
}
