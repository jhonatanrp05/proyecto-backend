import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
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

    @InjectQueue(SUBMISSIONS_QUEUE)
    private readonly submissionsQueue: Queue,
  ) {}

  async create(dto: CreateSubmissionDto, studentId: string): Promise<any> {
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

  async findById(id: string): Promise<any> {
    const submission = await this.submissionRepository.findById(id);
    if (!submission) {
      throw new NotFoundException(`Submission con ID ${id} no encontrado`);
    }
    return submission;
  }
}
