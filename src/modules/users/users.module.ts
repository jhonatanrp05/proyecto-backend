import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma';
import { UsersService } from './application/users.service';
import { UsersController } from './presentation/users.controller';
import { UserRepository } from './infrastructure/user.repository';
import { USER_REPOSITORY } from './domain/user.repository.interface';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: USER_REPOSITORY, useClass: UserRepository },
  ],
  exports: [UsersService],
})
export class UsersModule {}
