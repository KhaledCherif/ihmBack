import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Plumbing' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 1, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
