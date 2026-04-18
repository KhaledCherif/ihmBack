import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateServiceRequestDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  serviceId!: number;

  @ApiProperty({ example: '2026-04-22T10:00:00.000Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiProperty({ example: 'Tunis, El Menzah 6, street 10' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  location!: string;

  @ApiPropertyOptional({ example: 'Please bring all needed tools.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
