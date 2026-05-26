import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../domain/user.repository.interface';
import { UpdateUserDto } from './dtos/update-user.dto';
import { PrismaService } from '../../../shared/prisma';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly prisma: PrismaService,
  ) {}

  findAll() {
    return this.userRepository.findAll();
  }

  async findById(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id);
    return this.userRepository.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.userRepository.delete(id);
  }

  async getReport(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const submissions = await this.prisma.submission.findMany({
      where: { studentId: userId },
      include: {
        result: true,
        challenge: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const statusCounts: Record<string, number> = {};
    let totalScore = 0;
    let scoredCount = 0;

    const bestByChallenge: Record<
      string,
      { title: string; bestScore: number; attempts: number }
    > = {};

    for (const sub of submissions) {
      statusCounts[sub.status] = (statusCounts[sub.status] ?? 0) + 1;
      if (sub.result) {
        totalScore += sub.result.score;
        scoredCount++;
        const cid = sub.challengeId;
        if (!bestByChallenge[cid]) {
          bestByChallenge[cid] = {
            title: sub.challenge.title,
            bestScore: 0,
            attempts: 0,
          };
        }
        bestByChallenge[cid].attempts++;
        if (sub.result.score > bestByChallenge[cid].bestScore) {
          bestByChallenge[cid].bestScore = sub.result.score;
        }
      }
    }

    return {
      user,
      totalSubmissions: submissions.length,
      averageScore: scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0,
      statusBreakdown: statusCounts,
      challengesSummary: Object.entries(bestByChallenge).map(([id, v]) => ({
        challengeId: id,
        ...v,
      })),
    };
  }
}
