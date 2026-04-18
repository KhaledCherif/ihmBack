import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class ResolveConflictDto {
  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  loserUserId!: number;

  @ApiProperty({ example: 'Evidence confirms provider failed to complete the mission as requested.' })
  @IsString()
  @IsNotEmpty()
  adminDecision!: string;
}
