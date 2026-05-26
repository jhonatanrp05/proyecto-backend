
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AssessmentsRepository } from '../infrastructure/assessments.repository';

@Injectable()
export class AssessmentsService {
  constructor(private readonly assessmentsRepo: AssessmentsRepository) { }

  async create(
    professorId: string,
    dto: {
      name: string;
      description?: string;
      startDate: string;
      endDate: string;
      duration: number;
      maxAttempts: number;
      visibility: boolean;
      courseId: string;
      challengeIds?: string[];
    },
  ) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException('endDate debe ser posterior a startDate');
    }

    const courseProfessor = await this.assessmentsRepo.findCourseProfessor(
      dto.courseId,
    );
    if (!courseProfessor) {
      throw new NotFoundException(`Curso ${dto.courseId} no encontrado`);
    }
    if (courseProfessor !== professorId) {
      throw new ForbiddenException(
        'Solo puedes crear evaluaciones en tus propios cursos',
      );
    }

    const { challengeIds, ...rest } = dto;
    const assessment = await this.assessmentsRepo.create({
      ...rest,
      startDate,
      endDate,
    });

    if (challengeIds?.length) {
      await Promise.all(
        challengeIds.map((challengeId, index) =>
          this.assessmentsRepo.addChallenge(assessment.id, challengeId, index),
        ),
      );
      return this.assessmentsRepo.findById(assessment.id);
    }

    return assessment;
  }

  async findAll(courseId?: string) {
    return this.assessmentsRepo.findAll(courseId);
  }

  async findById(id: string) {
    const assessment = await this.assessmentsRepo.findById(id);
    if (!assessment) {
      throw new NotFoundException(`Assessment ${id} no encontrado`);
    }
    return assessment;
  }

  async update(
    id: string,
    professorId: string,
    dto: {
      name?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      duration?: number;
      maxAttempts?: number;
      visibility?: boolean;
    },
  ) {
    const assessment = await this.findById(id);
    if (assessment.course.professorId !== professorId) {
      throw new ForbiddenException(
        'Solo el profesor del curso puede modificar esta evaluación',
      );
    }
    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    if (data.startDate && data.endDate && data.endDate <= data.startDate) {
      throw new BadRequestException('endDate debe ser posterior a startDate');
    }
    return this.assessmentsRepo.update(id, data);
  }

  async delete(id: string, professorId: string) {
    const assessment = await this.findById(id);
    if (assessment.course.professorId !== professorId) {
      throw new ForbiddenException(
        'Solo el profesor del curso puede eliminar esta evaluación',
      );
    }
    return this.assessmentsRepo.delete(id);
  }

  async addChallenge(assessmentId: string, challengeId: string, order: number) {
    await this.findById(assessmentId);
    return this.assessmentsRepo.addChallenge(assessmentId, challengeId, order);
  }

  async removeChallenge(assessmentId: string, challengeId: string) {
    await this.findById(assessmentId);
    return this.assessmentsRepo.removeChallenge(assessmentId, challengeId);
  }

  async startAttempt(assessmentId: string, studentId: string) {
    const assessment = await this.findById(assessmentId);

    const enrolled = await this.assessmentsRepo.isStudentEnrolled(
      assessment.courseId,
      studentId,
    );
    if (!enrolled) {
      throw new ForbiddenException('No estás inscrito en el curso de esta evaluación');
    }

    const now = new Date();
    if (now < assessment.startDate || now > assessment.endDate) {
      throw new ForbiddenException(
        'La evaluación no está activa en este momento',
      );
    }

    const attempts = await this.assessmentsRepo.countAttempts(
      assessmentId,
      studentId,
    );
    if (attempts >= assessment.maxAttempts) {
      throw new ForbiddenException(
        'Superaste el máximo de intentos permitidos',
      );
    }

    return this.assessmentsRepo.createAttempt(assessmentId, studentId);
  }

  async listAttempts(
    assessmentId: string,
    requester: { id: string; role: string },
  ) {
    const assessment = await this.findById(assessmentId);

    if (requester.role === 'STUDENT') {
      return this.assessmentsRepo.findAttempts(assessmentId, requester.id);
    }

    if (
      requester.role === 'PROFESSOR' &&
      assessment.course.professorId !== requester.id
    ) {
      throw new ForbiddenException(
        'Solo el profesor del curso puede ver los intentos',
      );
    }

    return this.assessmentsRepo.findAttempts(assessmentId);
  }
}
