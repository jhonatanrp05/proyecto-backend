import {
  Controller,
  Get,
  Param,
  Patch,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators';
import { Role } from '../../../shared/constants';
import { RolesGuard } from '../../../shared/guards';
import { UsersService } from '../application/users.service';
import { UpdateUserDto } from '../application/dtos/update-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all users [ADMIN]' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user by ID [ADMIN]' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
  })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user [ADMIN]' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user [ADMIN]' })
  @ApiResponse({
    status: 204,
    description: 'User deleted successfully',
  })
  delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  @Get(':id/report')
  @Roles(Role.PROFESSOR, Role.STUDENT)
  @ApiOperation({
    summary: 'Get student report [PROFESSOR, STUDENT]',
    description: 'Returns detailed performance report for a student',
  })
  @ApiResponse({
    status: 200,
    description: 'Student report retrieved successfully',
  })
  getStudentReport(@Param('id') id: string) {
    return this.usersService.getReport(id);
  }
}
