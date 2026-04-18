import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ConfirmProposedStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  accept!: boolean;

  @ApiPropertyOptional({ example: 'I confirm the provider status change.' })
  @IsOptional()
  @IsString()
  reason?: string;
}
