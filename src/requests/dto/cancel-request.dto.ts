import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelRequestDto {
  @ApiPropertyOptional({ example: 'I no longer need this service.' })
  @IsOptional()
  @IsString()
  reason?: string;
}
