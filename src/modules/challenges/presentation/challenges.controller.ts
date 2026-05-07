import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';


import { Roles, CurrentUser } from '../../../shared/decorators';
import { Role } from '../../../shared/constants';
import { RolesGuard } from '../../../shared/guards';

@ApiTags('challenges')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('challenges')

export class ChallengesController {

    @Get(':id/stats')
    @Roles(Role.PROFESSOR)
    @ApiOperation({
    summary: 'Get challenge statistics [PROFESSOR]',
    description: 'Returns analytics and statistics for a challenge'
    })
    @ApiResponse({
    status: 200,
    description: 'Challenge statistics retrieved successfully'
    })
    getChallengeStats(
    @Param('id') id: string
    ) {
    return {};
    }

}