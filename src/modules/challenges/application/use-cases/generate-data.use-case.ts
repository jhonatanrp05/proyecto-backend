import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ChallengeRepository } from '../../domain/repositories/challenge.repository';
import { SeedData } from '../../domain/entities/seed-data.entity';
import {
  GenerateDataDto,
  FieldConfig,
  FieldType,
  EdgeCaseRow,
} from '../dtos/generate-data.dto';
import { faker } from '@faker-js/faker';

// Cuántas filas por INSERT — equilibrio entre rendimiento y memoria
const BATCH_SIZE = 1_000;

const ALLOWED_TYPES: FieldType[] = [
  'foreign_key',
  'decimal',
  'integer',
  'date',
  'enum',
  'boolean',
  'string',
  'name',
  'email',
  'phone',
  'address',
  'text',
];

@Injectable()
export class GenerateDataUseCase {
  constructor(private readonly challengeRepo: ChallengeRepository) {}

  async execute(
    challengeId: string,
    dto: GenerateDataDto,
    professorId: string,
  ): Promise<SeedData> {
    const challenge = await this.challengeRepo.findById(challengeId);

    if (!challenge) {
      throw new NotFoundException(
        `Reto con id "${challengeId}" no encontrado.`,
      );
    }

    if (challenge.createdBy !== professorId) {
      throw new ForbiddenException(
        'Solo el profesor que creó el reto puede generar datos.',
      );
    }

    if (!challenge.schema) {
      throw new BadRequestException(
        'El reto no tiene un esquema DDL cargado. Carga el esquema antes de generar datos.',
      );
    }

    this.validateDto(dto);

    const insertScript = this.buildInsertScript(dto);

    return this.challengeRepo.upsertSeedData(challengeId, insertScript, true);
  }

  // ------------------------------------------------------------------ //
  //  Validación de la configuración recibida
  // ------------------------------------------------------------------ //

  private validateDto(dto: GenerateDataDto): void {
    if (!dto.tables || dto.tables.length === 0) {
      throw new BadRequestException('Debes definir al menos una tabla.');
    }

    for (const t of dto.tables) {
      const columns = Object.keys(t.fields ?? {});
      if (columns.length === 0) {
        throw new BadRequestException(
          `La tabla "${t.table}" no tiene campos definidos.`,
        );
      }

      for (const [name, cfg] of Object.entries(t.fields)) {
        if (!ALLOWED_TYPES.includes(cfg.type)) {
          throw new BadRequestException(
            `Campo "${name}": tipo "${cfg.type}" no es válido.`,
          );
        }

        if (
          cfg.nullable !== undefined &&
          (typeof cfg.nullable !== 'number' ||
            cfg.nullable < 0 ||
            cfg.nullable > 1)
        ) {
          throw new BadRequestException(
            `Campo "${name}": "nullable" debe ser una fracción entre 0 y 1.`,
          );
        }

        if (
          (cfg.type === 'integer' || cfg.type === 'decimal') &&
          cfg.min !== undefined &&
          cfg.max !== undefined &&
          cfg.min > cfg.max
        ) {
          throw new BadRequestException(
            `Campo "${name}": "min" no puede ser mayor que "max".`,
          );
        }

        if (
          cfg.type === 'foreign_key' &&
          (!cfg.references || !/^[^.]+\.[^.]+$/.test(cfg.references))
        ) {
          throw new BadRequestException(
            `Campo "${name}": "references" debe tener el formato "tabla.columna".`,
          );
        }

        if (cfg.type === 'enum' && (!cfg.values || cfg.values.length === 0)) {
          throw new BadRequestException(
            `Campo "${name}": "enum" requiere al menos un valor en "values".`,
          );
        }
      }

      for (const ec of t.edgeCases ?? []) {
        for (const key of Object.keys(ec.values)) {
          if (!columns.includes(key)) {
            throw new BadRequestException(
              `Caso borde "${ec.description}": la columna "${key}" no existe en la tabla "${t.table}".`,
            );
          }
        }
      }
    }
  }

  // ------------------------------------------------------------------ //
  //  Builder principal
  // ------------------------------------------------------------------ //

  private buildInsertScript(dto: GenerateDataDto): string {
    // ids generados por tabla para respetar FK
    const generatedIds: Record<string, number[]> = {};
    const scripts: string[] = [];

    for (const tableConfig of dto.tables) {
      const { table, rows, fields, edgeCases: explicitEdgeCases } = tableConfig;
      const columns = Object.keys(fields).join(', ');
      const tableScripts: string[] = [];

      // ---- 1. Filas de casos borde automáticos (por campo con edgeCases: true)
      const autoEdgeRows = this.buildAutoEdgeCaseRows(fields, generatedIds);

      // ---- 2. Filas de casos borde explícitos (definidos por el profesor)
      const explicitRows = this.buildExplicitEdgeCaseRows(
        columns.split(', '),
        explicitEdgeCases ?? [],
      );

      const allEdgeRows = [...autoEdgeRows, ...explicitRows];

      if (allEdgeRows.length > 0) {
        const edgeValues = allEdgeRows.map((r) => `(${r.values.join(', ')})`);
        tableScripts.push(
          `-- Casos borde (${allEdgeRows.length} filas)\n` +
            `-- ${allEdgeRows.map((r) => r.description).join(' | ')}\n` +
            `INSERT INTO ${table} (${columns}) VALUES\n${edgeValues.join(',\n')};`,
        );
      }

      // ---- 3. Filas aleatorias normales
      let currentId = 1 + allEdgeRows.length; // offset para no colisionar IDs
      const ids: number[] = [];

      // Registrar IDs de los edge cases
      for (let i = 1; i <= allEdgeRows.length; i++) {
        ids.push(i);
      }

      for (let batchStart = 0; batchStart < rows; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, rows);
        const batchValues: string[] = [];

        for (let i = batchStart; i < batchEnd; i++) {
          const rowValues = Object.entries(fields).map(([, config]) =>
            this.generateValue(config, generatedIds),
          );
          ids.push(currentId++);
          batchValues.push(`(${rowValues.join(', ')})`);
        }

        tableScripts.push(
          `INSERT INTO ${table} (${columns}) VALUES\n${batchValues.join(',\n')};`,
        );
      }

      generatedIds[table] = ids;
      scripts.push(tableScripts.join('\n'));
    }

    return scripts.join('\n\n');
  }

  // ------------------------------------------------------------------ //
  //  Generador de casos borde automáticos
  // ------------------------------------------------------------------ //

  private buildAutoEdgeCaseRows(
    fields: Record<string, FieldConfig>,
    generatedIds: Record<string, number[]>,
  ): { description: string; values: string[] }[] {
    const edgeRows: { description: string; values: string[] }[] = [];
    const fieldEntries = Object.entries(fields);

    // Para cada campo que tenga edgeCases: true, generar filas especiales
    for (const [fieldName, config] of fieldEntries) {
      if (!config.edgeCases) continue;

      const edgeValues = this.getEdgeValuesForField(fieldName, config);

      for (const edge of edgeValues) {
        // Construir una fila completa: el campo borde tiene el valor especial,
        // los demás campos reciben valores normales aleatorios
        const rowValues = fieldEntries.map(([name, cfg]) => {
          if (name === fieldName) return edge.value;
          return this.generateValue(cfg, generatedIds);
        });

        edgeRows.push({
          description: `${fieldName}: ${edge.description}`,
          values: rowValues,
        });
      }
    }

    return edgeRows;
  }

  /**
   * Retorna los valores borde para un campo según su tipo.
   */
  private getEdgeValuesForField(
    fieldName: string,
    config: FieldConfig,
  ): { value: string; description: string }[] {
    const edges: { value: string; description: string }[] = [];

    switch (config.type) {
      case 'integer': {
        const min = config.min ?? 0;
        const max = config.max ?? 1_000_000;
        const candidates = new Map<string, string>();
        candidates.set(String(min), `valor mínimo (${min})`);
        candidates.set(String(max), `valor máximo (${max})`);
        if (min <= 0 && 0 <= max) candidates.set('0', 'cero');
        for (const [value, description] of candidates) {
          edges.push({ value, description });
        }
        break;
      }

      case 'decimal': {
        const min = config.min ?? 0;
        const max = config.max ?? 1_000;
        const candidates = new Map<string, string>();
        candidates.set(String(min), `valor mínimo (${min})`);
        candidates.set(String(max), `valor máximo (${max})`);
        if (min <= 0 && 0 <= max) candidates.set('0.00', 'cero');
        const justAboveMin = Number((min + 0.01).toFixed(2));
        if (justAboveMin <= max) {
          candidates.set(String(justAboveMin), 'mínimo + 0.01');
        }
        for (const [value, description] of candidates) {
          edges.push({ value, description });
        }
        break;
      }

      case 'date': {
        const from = config.from ?? '2020-01-01';
        const to = config.to ?? new Date().toISOString().split('T')[0];
        edges.push({
          value: `'${from}'`,
          description: `fecha inicio del rango`,
        });
        edges.push({
          value: `'${to}'`,
          description: `fecha fin del rango`,
        });
        break;
      }

      case 'enum': {
        // Incluir cada valor del enum para asegurar cobertura completa
        const values = config.values ?? [];
        for (const v of values) {
          edges.push({
            value: `'${this.escape(v)}'`,
            description: `enum valor '${v}'`,
          });
        }
        break;
      }

      case 'name':
      case 'string':
      case 'text':
      case 'address': {
        edges.push({ value: "''", description: 'string vacío' });
        edges.push({
          value: `'${this.escape('A'.repeat(100))}'`,
          description: 'string muy largo (100 chars)',
        });
        break;
      }

      case 'boolean': {
        edges.push({ value: 'TRUE', description: 'true' });
        edges.push({ value: 'FALSE', description: 'false' });
        break;
      }
    }

    // Agregar NULL si el campo es nullable
    if (config.nullable && config.nullable > 0) {
      edges.push({ value: 'NULL', description: 'valor nulo' });
    }

    return edges;
  }

  // ------------------------------------------------------------------ //
  //  Casos borde explícitos del profesor
  // ------------------------------------------------------------------ //

  private buildExplicitEdgeCaseRows(
    columnNames: string[],
    edgeCases: EdgeCaseRow[],
  ): { description: string; values: string[] }[] {
    return edgeCases.map((ec) => {
      const values = columnNames.map((col) => {
        const val = ec.values[col];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (typeof val === 'number') return String(val);
        return `'${this.escape(String(val))}'`;
      });

      return { description: ec.description, values };
    });
  }

  // ------------------------------------------------------------------ //
  //  Generador de valores por tipo (aleatorio normal)
  // ------------------------------------------------------------------ //

  private generateValue(
    config: FieldConfig,
    generatedIds: Record<string, number[]>,
  ): string {
    // Nulos aleatorios
    if (config.nullable && Math.random() < config.nullable) {
      return 'NULL';
    }

    switch (config.type) {
      case 'foreign_key': {
        const [refTable] = config.references!.split('.');
        const ids = generatedIds[refTable];
        if (!ids || ids.length === 0) {
          throw new BadRequestException(
            `La tabla "${refTable}" debe generarse antes que la tabla que la referencia. Revisa el orden de las tablas en la configuración.`,
          );
        }
        const randomId = ids[Math.floor(Math.random() * ids.length)];
        return String(randomId);
      }

      case 'integer': {
        const min = config.min ?? 0;
        const max = config.max ?? 1_000_000;
        return String(faker.number.int({ min, max }));
      }

      case 'decimal': {
        const min = config.min ?? 0;
        const max = config.max ?? 1_000;
        const value = faker.number.float({ min, max, fractionDigits: 2 });
        return String(value);
      }

      case 'date': {
        const from = config.from
          ? new Date(config.from)
          : new Date('2020-01-01');
        const to = config.to ? new Date(config.to) : new Date();
        const date = faker.date.between({ from, to });
        return `'${date.toISOString().split('T')[0]}'`;
      }

      case 'enum': {
        const values = config.values ?? [];
        if (values.length === 0) {
          throw new BadRequestException(
            'El campo enum debe tener al menos un valor.',
          );
        }
        const picked = values[Math.floor(Math.random() * values.length)];
        return `'${this.escape(picked)}'`;
      }

      case 'boolean':
        return faker.datatype.boolean() ? 'TRUE' : 'FALSE';

      case 'name':
        return `'${this.escape(faker.person.fullName())}'`;

      case 'email':
        return `'${this.escape(faker.internet.email())}'`;

      case 'phone':
        return `'${this.escape(faker.phone.number())}'`;

      case 'address':
        return `'${this.escape(faker.location.streetAddress())}'`;

      case 'text':
        return `'${this.escape(faker.lorem.sentence())}'`;

      case 'string':
      default:
        return `'${this.escape(faker.lorem.word())}'`;
    }
  }

  // Escapa comillas simples para no romper el SQL
  private escape(value: string): string {
    return value.replace(/'/g, "''");
  }
}
