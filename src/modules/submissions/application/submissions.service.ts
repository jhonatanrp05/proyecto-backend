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

    // guardar el submission en la BD con estado "QUEUED"
    let submission: any;
    try {
      submission = await this.submissionRepository.create({
        studentId,
        challengeId: dto.challengeId,
        query: dto.query,
        engine: dto.engine,
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
