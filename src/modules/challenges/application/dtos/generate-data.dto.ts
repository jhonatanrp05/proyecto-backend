import { IsArray, IsInt, IsPositive, IsString, IsNotEmpty, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export type FieldType = 'foreign_key' | 'decimal' | 'date' | 'enum' | 'string';

export interface FieldConfig {
  type: FieldType;
  // foreign_key
  references?: string;   // ej: "customers.id"
  // decimal
  min?: number;
  max?: number;
  // date
  from?: string;         // ej: "2026-01-01"
  to?: string;
  // enum
  values?: string[];
  // nulos
  nullable?: number;     // porcentaje entre 0 y 1, ej: 0.1 = 10% nulos
}

export class TableGenerationConfig {
  @ApiProperty({ example: 'orders' })
  @IsString()
  @IsNotEmpty()
  table!: string;

  @ApiProperty({ example: 1000 })
  @IsInt()
  @IsPositive()
  rows!: number;

  @ApiProperty({
    example: {
      customer_id: { type: 'foreign_key', references: 'customers.id' },
      total: { type: 'decimal', min: 10000, max: 500000 },
      created_at: { type: 'date', from: '2026-01-01', to: '2026-12-31' },
      status: { type: 'enum', values: ['PENDING', 'PAID', 'CANCELLED'] },
    },
  })
  @IsObject()
  fields!: Record<string, FieldConfig>;
}

export class GenerateDataDto {
  @ApiProperty({
    description: 'Lista de tablas a generar. El orden importa: las tablas referenciadas por FK deben ir primero.',
    type: [TableGenerationConfig],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TableGenerationConfig)
  tables!: TableGenerationConfig[];
}
