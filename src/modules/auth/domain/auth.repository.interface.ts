import { User } from '../../../shared/prisma';

export interface IAuthRepository {
  findByEmail(email: string): Promise<User | null>;
  create(data: {
    email: string;
    password: string;
    name: string;
    role?: string;
  }): Promise<User>;
}

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');
