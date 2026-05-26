import {
  IsArray,
  IsInt,
  IsOptional,
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
  values?: string[];
  // Fracción de valores nulos (0 = ninguno, 1 = todos). Ej: 0.1 = 10%
  nullable?: number;
  // Si es true, genera automáticamente filas con valores límite para este campo
  edgeCases?: boolean;
}

/**
 * Configuración de un caso borde explícito para una tabla.
 * El profesor define manualmente una fila con valores específicos
 * que pondrán a prueba las consultas de los estudiantes.
 */
export interface EdgeCaseRow {
  /** Descripción del caso borde (ej: "Cliente con exactamente 3 compras") */
  description: string;
  /** Valores para cada columna de la fila */
  values: Record<string, string | number | boolean | null>;
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
      total: { type: 'decimal', min: 10000, max: 500000, edgeCases: true },
      created_at: { type: 'date', from: '2026-01-01', to: '2026-12-31', edgeCases: true },
      status: { type: 'enum', values: ['PENDING', 'PAID', 'CANCELLED'] },
      name: { type: 'name', edgeCases: true },
      email: { type: 'email' },
      phone: { type: 'phone' },
      address: { type: 'address' },
      notes: { type: 'text' },
      quantity: { type: 'integer', min: 1, max: 100, edgeCases: true },
      active: { type: 'boolean' },
    },
  })
  @IsObject()
  fields!: Record<string, FieldConfig>;

  @ApiProperty({
    required: false,
    description:
      'Filas de casos borde explícitos que el profesor quiere incluir para validar consultas',
    example: [
      {
        description: 'Cliente con nombre NULL',
        values: { name: null, city: 'Bogotá' },
      },
      {
        description: 'Cliente con string vacío',
        values: { name: '', city: '' },
      },
    ],
  })
  @IsArray()
  @IsOptional()
  edgeCases?: EdgeCaseRow[];
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
