import { IsEnum, IsString, IsNotEmpty, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ChallengeStatus } from '../../domain/entities/challenge.entity';

export class ChangeChallengeStatusDto {
  @ApiProperty({ enum: ['draft', 'published', 'archived'] })
  @IsEnum(['draft', 'published', 'archived'])
  status!: ChallengeStatus;
}

export class UploadSchemaDto {
  @ApiProperty({
    example:
      'CREATE TABLE customers (id SERIAL PRIMARY KEY, name VARCHAR(100));',
    description: 'Script DDL con los CREATE TABLE del reto',
  })
  @IsString()
  @IsNotEmpty()
  ddlScript!: string;
}

export class UploadSeedDataDto {
  @ApiProperty({
    example: "INSERT INTO customers (name) VALUES ('Ana'), ('Luis');",
    description: 'Script con los INSERT INTO para poblar las tablas',
  })
  @IsString()
  @IsNotEmpty()
  insertScript!: string;
}

export class SetExpectedResultDto {
  @ApiProperty({
    example: 'SELECT name FROM customers WHERE id > 3;',
    description: 'Query SQL correcta de referencia',
  })
  @IsString()
  @IsNotEmpty()
  query!: string;

  @ApiProperty({
    example: [{ name: 'Ana' }, { name: 'Luis' }],
    description: 'Resultado esperado como array de objetos JSON',
  })
  @IsArray()
  outputJson!: Record<string, unknown>[];
}
