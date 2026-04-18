import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class OpenConflictDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  serviceRequestId!: number;

  @ApiProperty({ example: 'Provider marked mission completed without finishing work.' })
  @IsString()
  @IsNotEmpty()
  proof!: string;

  @ApiPropertyOptional({ example: 'Attached photos and conversation logs.' })
  @IsOptional()
  @IsString()
  additionalNotes?: string;
}
