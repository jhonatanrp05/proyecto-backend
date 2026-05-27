import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueEvents } from 'bullmq';
import { PrismaService } from '../../../shared/prisma';
import {
  ISubmissionRepository,
  SUBMISSION_REPOSITORY,
} from '../domain/submission.repository.interface';
import { CreateSubmissionDto } from './dtos/create-submission.dto';
import { PreviewSubmissionDto } from './dtos/preview-submission.dto';

// Nombre de la cola
//debe coincidir exactamente con el worker
export const SUBMISSIONS_QUEUE = 'submissions';

// Tiempo máximo que la API espera el resultado de un preview antes de abortar.
const PREVIEW_TIMEOUT_MS = 60_000;

export interface PreviewResult {
  status: 'OK' | 'TIMEOUT' | 'SYNTAX_ERROR' | 'RUNTIME_ERROR';
  rows: Record<string, unknown>[];
  executionTimeMs: number;
  errorMessage?: string;
}

@Injectable()
export class SubmissionsService implements OnModuleInit, OnModuleDestroy {
  // Necesario para esperar el valor de retorno del job de preview (lo produce el worker).
  private queueEvents?: QueueEvents;

  constructor(
    @Inject(SUBMISSION_REPOSITORY)
    private readonly submissionRepository: ISubmissionRepository,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,

    @InjectQueue(SUBMISSIONS_QUEUE)
    private readonly submissionsQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    this.queueEvents = new QueueEvents(SUBMISSIONS_QUEUE, {
      connection: {
        host: this.config.get<string>('REDIS_HOST'),
        port: this.config.get<number>('REDIS_PORT'),
      },
    });
    await this.queueEvents.waitUntilReady();
  }

  async onModuleDestroy(): Promise<void> {
    await this.queueEvents?.close();
  }

  async preview(
    dto: PreviewSubmissionDto,
    requester: { id: string; role: string },
  ): Promise<PreviewResult> {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: dto.challengeId },
      select: {
        id: true,
        status: true,
        courseId: true,
        timeLimit: true,
        schema: { select: { ddlScript: true } },
        seedData: { select: { insertScript: true } },
      },
    });

    if (!challenge) {
      throw new BadRequestException(
        `El reto con ID "${dto.challengeId}" no existe`,
      );
    }

    if (!challenge.schema) {
      throw new BadRequestException(
        'El reto aún no tiene un esquema configurado para ejecutar consultas',
      );
    }

    // Los estudiantes solo pueden probar consultas en retos de cursos en los que
    // están inscritos. Profesor/Admin pueden previsualizar sin restricción.
    if (requester.role === 'STUDENT') {
      const enrollment = await this.prisma.courseStudent.findUnique({
        where: {
          courseId_studentId: {
            courseId: challenge.courseId,
            studentId: requester.id,
          },
        },
        select: { courseId: true },
      });

      if (!enrollment) {
        throw new ForbiddenException(
          'No estás inscrito en el curso de este reto',
        );
      }
    }

    if (!this.queueEvents) {
      throw new BadRequestException('El servicio de preview no está disponible');
    }

    const job = await this.submissionsQueue.add('preview', {
      ddlScript: challenge.schema.ddlScript,
      seedScript: challenge.seedData?.insertScript ?? '',
      studentQuery: dto.query,
      timeLimitMs: challenge.timeLimit,
    });

    const result = (await job.waitUntilFinished(
      this.queueEvents,
      PREVIEW_TIMEOUT_MS,
    )) as PreviewResult;

    return result;
  }

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
