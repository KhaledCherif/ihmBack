import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Ali Ben Salah' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'ali@example.com' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @ApiProperty({ example: '+21620111222' })
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @Matches(/^\+?[0-9]{8,20}$/, {
    message: 'phoneNumber must contain only digits and optional leading +',
  })
  phoneNumber!: string;

  @ApiProperty({ example: 'StrongP@ss1' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}/, {
    message:
      'password must contain at least 8 chars with uppercase, lowercase, number and special character',
  })
  password!: string;

  @ApiProperty({ example: '2000-05-12' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiProperty({ example: 'Tunis, Tunisia' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address!: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isProvider?: boolean;
}
