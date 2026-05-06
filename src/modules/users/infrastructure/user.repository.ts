import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma';
import { IUserRepository } from '../domain/user.repository.interface';

const SELECT_SAFE = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({ select: SELECT_SAFE });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: SELECT_SAFE });
  }

  update(
    id: string,
    data: Partial<{ name: string; email: string; role: string }>,
  ) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: SELECT_SAFE,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
