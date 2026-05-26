import { Role } from '../../../shared/constants';

export interface IUserRepository {
  findAll(): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  findByEmail(email: string): Promise<any | null>;
  create(data: {
    email: string;
    name: string;
    password: string;
    role: Role;
  }): Promise<any>;
  update(
    id: string,
    data: Partial<{ name: string; email: string; role: Role }>,
  ): Promise<any>;
  delete(id: string): Promise<void>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
