import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ChallengeRepository } from '../../domain/repositories/challenge.repository';
import { SeedData } from '../../domain/entities/seed-data.entity';
import { GenerateDataDto, FieldConfig } from '../dtos/generate-data.dto';
import { faker } from '@faker-js/faker';

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


  //  Generador de INSERTs

  private buildInsertScript(dto: GenerateDataDto): string {
    // Mapa de ids generados por tabla para respetar FK
    const generatedIds: Record<string, (string | number)[]> = {};
    const scripts: string[] = [];

    for (const tableConfig of dto.tables) {
      const { table, rows, fields } = tableConfig;
      const values: string[] = [];
      const ids: (string | number)[] = [];

      for (let i = 0; i < rows; i++) {
        const rowValues = Object.entries(fields).map(([, config]) =>
          this.generateValue(config, generatedIds),
        );

        // Si hay un campo id serial, guardamos el índice (i+1) como id generado para esa tabla
        ids.push(i + 1);
        values.push(`(${rowValues.join(', ')})`);
      }

      generatedIds[table] = ids;

      const columns = Object.keys(fields).join(', ');
      scripts.push(
        `INSERT INTO ${table} (${columns}) VALUES\n${values.join(',\n')};`,
      );
    }

    return scripts.join('\n\n');
  }

  private generateValue(
    config: FieldConfig,
    generatedIds: Record<string, (string | number)[]>,
  ): string {
    // Porcentaje de nulos
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

      case 'decimal': {
        const min = config.min ?? 0;
        const max = config.max ?? 1000;
        const value = faker.number.float({ min, max, fractionDigits: 2 });
        return String(value);
      }

      case 'date': {
        const from = config.from ? new Date(config.from) : new Date('2020-01-01');
        const to = config.to ? new Date(config.to) : new Date();
        const date = faker.date.between({ from, to });
        return `'${date.toISOString().split('T')[0]}'`;
      }

      case 'enum': {
        const values = config.values ?? [];
        if (values.length === 0) throw new BadRequestException('El campo enum debe tener al menos un valor.');
        const picked = values[Math.floor(Math.random() * values.length)];
        return `'${picked}'`;
      }

      case 'string':
      default:
        return `'${faker.lorem.word()}'`;
    }
  }
}
