import { PartialType } from '@nestjs/swagger';
import { CreateChallengeDto } from './create-challenge.dto';
import { OmitType } from '@nestjs/swagger';

// Permite actualizar todos los campos excepto courseId (no se puede mover un reto de curso)
export class UpdateChallengeDto extends PartialType(
  OmitType(CreateChallengeDto, ['courseId'] as const),
) {}
