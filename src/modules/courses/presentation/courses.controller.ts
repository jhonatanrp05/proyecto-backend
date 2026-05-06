import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles, CurrentUser } from '../../../shared/decorators';
import { Role } from '../../../shared/constants';
import { RolesGuard } from '../../../shared/guards';
import { CoursesService } from '../application/courses.service';
import { CreateCourseDto } from '../application/dtos/create-course.dto';
import { UpdateCourseDto } from '../application/dtos/update-course.dto';
import { EnrollStudentDto } from '../application/dtos/enroll-student.dto';

@ApiTags('courses')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(Role.PROFESSOR)
  @ApiOperation({ summary: 'Create a course [PROFESSOR]' })
  create(@Body() dto: CreateCourseDto, @CurrentUser() user: any) {
    return this.coursesService.create(dto, user.id);
  }

  @Get()
  @Roles(Role.PROFESSOR, Role.ADMIN)
  @ApiOperation({ summary: 'List all courses [PROFESSOR, ADMIN]' })
  findAll() {
    return this.coursesService.findAll();
  }

  @Get(':id')
  @Roles(Role.PROFESSOR, Role.STUDENT, Role.ADMIN)
  @ApiOperation({ summary: 'Get course by ID [PROFESSOR, STUDENT, ADMIN]' })
  findOne(@Param('id') id: string) {
    return this.coursesService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.PROFESSOR, Role.ADMIN)
  @ApiOperation({ summary: 'Update course [PROFESSOR, ADMIN]' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: any,
  ) {
    return this.coursesService.update(id, dto, user.id, user.role);
  }

  @Delete(':id')
  @Roles(Role.PROFESSOR, Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete course [PROFESSOR, ADMIN]' })
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.coursesService.delete(id, user.id, user.role);
  }

  @Post(':id/students')
  @Roles(Role.PROFESSOR)
  @ApiOperation({ summary: 'Enroll student in course [PROFESSOR]' })
  enroll(
    @Param('id') courseId: string,
    @Body() dto: EnrollStudentDto,
    @CurrentUser() user: any,
  ) {
    return this.coursesService.enrollStudent(courseId, dto.studentId, user.id);
  }

  @Delete(':id/students/:studentId')
  @Roles(Role.PROFESSOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unenroll student from course [PROFESSOR]' })
  unenroll(
    @Param('id') courseId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: any,
  ) {
    return this.coursesService.unenrollStudent(courseId, studentId, user.id);
  }
}
