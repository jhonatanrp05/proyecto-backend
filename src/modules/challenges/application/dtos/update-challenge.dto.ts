import { PartialType } from '@nestjs/swagger';
import { CreateChallengeDto } from './create-challenge.dto';
import { OmitType } from '@nestjs/swagger';


export class UpdateChallengeDto extends PartialType(
  OmitType(CreateChallengeDto, ['courseId'] as const),
) {}
