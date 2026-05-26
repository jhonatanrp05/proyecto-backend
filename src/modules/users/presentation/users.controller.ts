import {
  Controller,
  Get,
  Param,
  Post,
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
import { CreateUserDto } from '../application/dtos/create-user.dto';
import { UpdateUserDto } from '../application/dtos/update-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a user [ADMIN]' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
  })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

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

}
