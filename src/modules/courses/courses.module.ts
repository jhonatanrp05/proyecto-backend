import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma';
import { CoursesService } from './application/courses.service';
import { CoursesController } from './presentation/courses.controller';
import { CourseRepository } from './infrastructure/course.repository';
import { COURSE_REPOSITORY } from './domain/course.repository.interface';

@Module({
  imports: [PrismaModule],
  controllers: [CoursesController],
  providers: [
    CoursesService,
    { provide: COURSE_REPOSITORY, useClass: CourseRepository },
  ],
  exports: [CoursesService],
})
export class CoursesModule {}
