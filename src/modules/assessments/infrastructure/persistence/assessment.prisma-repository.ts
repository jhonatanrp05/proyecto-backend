
import { Injectable } from '@nestjs/common';
import { AssessmentRepository } from '../../domain/repositories/assesment.repository';
import { Assessment } from '../../domain/entities/assessment.entity';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

@Injectable()
export class AssessmentPrismaRepository extends AssessmentRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  // Convierte el objeto de Prisma a tu entidad de dominio
  private toEntity(raw: any): Assessment {
    const entity = new Assessment();
    entity.id = raw.id;
    entity.name = raw.name;
    entity.description = raw.description;
    entity.startDate = raw.startDate;
    entity.endDate = raw.endDate;
    entity.duration = raw.duration;
    entity.maxAttempts = raw.maxAttempts;
    entity.visibility = raw.visibility;
    entity.courseId = raw.courseId;
    entity.challengeIds = raw.challengeIds;
    entity.createdAt = raw.createdAt;
    entity.updatedAt = raw.updatedAt;
    return entity;
  }

  async findById(id: string): Promise<Assessment | null> {
    const raw = await this.prisma.assessment.findUnique({ where: { id } });
    return raw ? this.toEntity(raw) : null;
  }

  async findAll(): Promise<Assessment[]> {
    const raws = await this.prisma.assessment.findMany();
    return raws.map((raw) => this.toEntity(raw));
  }

  async findByCourse(courseId: string): Promise<Assessment[]> {
    const raws = await this.prisma.assessment.findMany({ where: { courseId } });
    return raws.map((raw) => this.toEntity(raw));
  }

  async save(data: Partial<Assessment>): Promise<Assessment> {
    const raw = await this.prisma.assessment.create({ data: data as any });
    return this.toEntity(raw);
  }

  async update(id: string, data: Partial<Assessment>): Promise<Assessment> {
    const raw = await this.prisma.assessment.update({ where: { id }, data });
    return this.toEntity(raw);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.assessment.delete({ where: { id } });
  }
}