import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../shared/prisma';
import {
  ISubmissionRepository,
  SUBMISSION_REPOSITORY,
} from '../domain/submission.repository.interface';
import { CreateSubmissionDto } from './dtos/create-submission.dto';

// Nombre de la cola
//debe coincidir exactamente con el worker
export const SUBMISSIONS_QUEUE = 'submissions';

@Injectable()
export class SubmissionsService {
  constructor(
    @Inject(SUBMISSION_REPOSITORY)
    private readonly submissionRepository: ISubmissionRepository,
    private readonly prisma: PrismaService,

    @InjectQueue(SUBMISSIONS_QUEUE)
    private readonly submissionsQueue: Queue,
  ) {}

  async create(dto: CreateSubmissionDto, studentId: string): Promise<any> {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: dto.challengeId },
      select: { id: true, status: true, courseId: true },
    });

    if (!challenge) {
      throw new BadRequestException(
        `El reto con ID "${dto.challengeId}" no existe`,
      );
    }

    if (challenge.status !== 'published') {
      throw new ForbiddenException(
        'Solo se pueden enviar soluciones a retos publicados',
      );
    }

    const enrollment = await this.prisma.courseStudent.findUnique({
      where: {
        courseId_studentId: {
          courseId: challenge.courseId,
          studentId,
        },
      },
      select: { courseId: true },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'No estás inscrito en el curso de este reto',
      );
    }

    await this.validateAssessmentContext(
      dto.assessmentAttemptId,
      dto.challengeId,
      studentId,
    );

    // guardar el submission en la BD con estado "QUEUED"
    let submission: any;
    try {
      submission = await this.submissionRepository.create({
        studentId,
        challengeId: dto.challengeId,
        query: dto.query,
        engine: dto.engine,
        assessmentAttemptId: dto.assessmentAttemptId,
      });
    } catch (err: any) {
      if (err?.code === 'P2003') {
        throw new BadRequestException(
          `El reto con ID "${dto.challengeId}" no existe`,
        );
      }
      throw err;
    }

    // enviar el trabajo a la cola de Redis (BullMQ)
    await this.submissionsQueue.add('evaluate', {
      submissionId: submission.id,
    });

    return submission;
  }

  private async validateAssessmentContext(
    assessmentAttemptId: string | undefined,
    challengeId: string,
    studentId: string,
  ): Promise<void> {
    const now = new Date();

    if (!assessmentAttemptId) {
      const activeAssessment = await this.prisma.assessmentChallenge.findFirst({
        where: {
          challengeId,
          assessment: {
            startDate: { lte: now },
            endDate: { gte: now },
            course: {
              students: {
                some: { studentId },
              },
            },
          },
        },
        select: { assessmentId: true },
      });

      if (activeAssessment) {
        throw new ForbiddenException(
          'Este reto está en una evaluación activa. Debes enviar la solución con assessmentAttemptId.',
        );
      }

      return;
    }

    await this.validateAssessmentAttempt(
      assessmentAttemptId,
      challengeId,
      studentId,
      now,
    );
  }

  private async validateAssessmentAttempt(
    assessmentAttemptId: string,
    challengeId: string,
    studentId: string,
    now: Date,
  ): Promise<void> {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: assessmentAttemptId },
      include: {
        assessment: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            duration: true,
            challenges: {
              select: { challengeId: true },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException(
        `AssessmentAttempt con ID "${assessmentAttemptId}" no existe`,
      );
    }

    if (attempt.studentId !== studentId) {
      throw new ForbiddenException(
        'No puedes enviar soluciones con un intento de otro estudiante',
      );
    }

    if (attempt.finishedAt) {
      throw new ForbiddenException(
        'Este intento ya fue finalizado y no acepta más submissions',
      );
    }

    if (
      now < attempt.assessment.startDate ||
      now > attempt.assessment.endDate
    ) {
      throw new ForbiddenException(
        'La evaluación asociada a este intento no está activa en este momento',
      );
    }

    const attemptDeadline = new Date(
      attempt.startedAt.getTime() + attempt.assessment.duration * 60_000,
    );
    if (now > attemptDeadline) {
      throw new ForbiddenException(
        'El tiempo máximo permitido para este intento ya expiró',
      );
    }

    const challengeIncluded = attempt.assessment.challenges.some(
      (assessmentChallenge) => assessmentChallenge.challengeId === challengeId,
    );
    if (!challengeIncluded) {
      throw new BadRequestException(
        'El reto enviado no pertenece a la evaluación asociada al intento',
      );
    }
  }

  async findAll(
    requester: { id: string; role: string },
    challengeId?: string,
  ): Promise<any[]> {
    if (requester.role === 'STUDENT') {
      return this.submissionRepository.findMany({
        studentId: requester.id,
        challengeId,
      });
    }
    if (requester.role === 'PROFESSOR') {
      return this.submissionRepository.findMany({
        professorId: requester.id,
        challengeId,
      });
    }
    // ADMIN
    return this.submissionRepository.findMany({ challengeId });
  }

  async findById(
    id: string,
    requester: { id: string; role: string },
  ): Promise<any> {
    const submission = await this.submissionRepository.findById(id);
    if (!submission) {
      throw new NotFoundException(`Submission con ID ${id} no encontrado`);
    }

    if (requester.role === 'STUDENT' && submission.studentId !== requester.id) {
      throw new ForbiddenException(
        'No tienes permisos para ver este submission',
      );
    }

    if (
      requester.role === 'PROFESSOR' &&
      submission.challenge?.course?.professorId !== requester.id
    ) {
      throw new ForbiddenException(
        'No tienes permisos para ver este submission',
      );
    }

    return submission;
  }
}
