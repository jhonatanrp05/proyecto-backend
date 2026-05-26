import {
  IsArray,
  IsInt,
  IsPositive,
  IsString,
  IsNotEmpty,
  ValidateNested,
  IsObject,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export type FieldType =
  | 'foreign_key'
  | 'decimal'
  | 'integer'
  | 'date'
  | 'enum'
  | 'boolean'
  | 'string'
  | 'name'
  | 'email'
  | 'phone'
  | 'address'
  | 'text';

export interface FieldConfig {
  type: FieldType;
  // foreign_key
  references?: string; // ej: "customers.id"
  // decimal / integer
  min?: number;
  max?: number;
  // date
  from?: string;
  to?: string;
  // enum
  values?: string[];
  // nulos — porcentaje entre 0 y 1
  nullable?: number;
}

export class TableGenerationConfig {
  @ApiProperty({ example: 'orders' })
  @IsString()
  @IsNotEmpty()
  table!: string;

  @ApiProperty({ example: 10000, description: 'Máximo 100000 filas por tabla' })
  @IsInt()
  @IsPositive()
  @Max(100_000)
  rows!: number;

  @ApiProperty({
    example: {
      customer_id: { type: 'foreign_key', references: 'customers.id' },
      total: { type: 'decimal', min: 10000, max: 500000 },
      created_at: { type: 'date', from: '2026-01-01', to: '2026-12-31' },
      status: { type: 'enum', values: ['PENDING', 'PAID', 'CANCELLED'] },
      name: { type: 'name' },
      email: { type: 'email' },
      phone: { type: 'phone' },
      address: { type: 'address' },
      notes: { type: 'text' },
      quantity: { type: 'integer', min: 1, max: 100 },
      active: { type: 'boolean' },
    },
  })
  @IsObject()
  fields!: Record<string, FieldConfig>;
}

export class GenerateDataDto {
  @ApiProperty({
    description:
      'Lista de tablas a generar. El orden importa: las tablas referenciadas por FK deben ir primero.',
    type: [TableGenerationConfig],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TableGenerationConfig)
  tables!: TableGenerationConfig[];
}
