import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PriceMode } from '../../common/enums/price-mode.enum';

export class CreateServiceDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  categoryId!: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  subCategoryId!: number;

  @ApiProperty({ example: 'Fix leaking sink' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  title!: string;

  @ApiProperty({ example: 'Professional sink repair with tools included.' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 'Tunis' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  region!: string;

  @ApiProperty({ enum: PriceMode, example: PriceMode.FIXED })
  @IsEnum(PriceMode)
  priceMode!: PriceMode;

  @ApiPropertyOptional({ example: 60 })
  @ValidateIf((o: CreateServiceDto) => o.priceMode !== PriceMode.FREE)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'TND', default: 'TND' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({
    example: ['uploads/services/1-1.jpg'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  isHidden?: boolean;
}
