import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ChallengeRepository } from '../../domain/repositories/challenge.repository';
import { SeedData } from '../../domain/entities/seed-data.entity';
import { GenerateDataDto, FieldConfig } from '../dtos/generate-data.dto';
import { faker } from '@faker-js/faker';

// Cuántas filas por INSERT — equilibrio entre rendimiento y memoria
const BATCH_SIZE = 1_000;

@Injectable()
export class GenerateDataUseCase {
  constructor(private readonly challengeRepo: ChallengeRepository) {}

  async execute(challengeId: string, dto: GenerateDataDto, professorId: string): Promise<SeedData> {
    const challenge = await this.challengeRepo.findById(challengeId);

    if (!challenge) {
      throw new NotFoundException(`Reto con id "${challengeId}" no encontrado.`);
    }

    if (challenge.createdBy !== professorId) {
      throw new ForbiddenException('Solo el profesor que creó el reto puede generar datos.');
    }

    if (!challenge.schema) {
      throw new BadRequestException('El reto no tiene un esquema DDL cargado. Carga el esquema antes de generar datos.');
    }

    const insertScript = this.buildInsertScript(dto);

    return this.challengeRepo.upsertSeedData(challengeId, insertScript, true);
  }

  // ------------------------------------------------------------------ //
  //  Builder principal
  // ------------------------------------------------------------------ //

  private buildInsertScript(dto: GenerateDataDto): string {
    // ids generados por tabla para respetar FK
    const generatedIds: Record<string, number[]> = {};
    const scripts: string[] = [];

    for (const tableConfig of dto.tables) {
      const { table, rows, fields } = tableConfig;
      const columns = Object.keys(fields).join(', ');
      const tableScripts: string[] = [];

      // Generamos en batches para no acumular todo en memoria
      let currentId = 1;
      const ids: number[] = [];

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
  //  Generador de valores por tipo
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
        const from = config.from ? new Date(config.from) : new Date('2020-01-01');
        const to   = config.to   ? new Date(config.to)   : new Date();
        const date = faker.date.between({ from, to });
        return `'${date.toISOString().split('T')[0]}'`;
      }

      case 'enum': {
        const values = config.values ?? [];
        if (values.length === 0) {
          throw new BadRequestException('El campo enum debe tener al menos un valor.');
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