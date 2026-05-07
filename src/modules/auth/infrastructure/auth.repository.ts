import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma';
import { IAuthRepository } from '../domain/auth.repository.interface';

@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(data: {
    email: string;
    password: string;
    name: string;
    role?: string;
  }) {
    return this.prisma.user.create({ data: data as any });
  }
}
