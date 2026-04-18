import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ServiceRequestStatus } from '../../common/enums/service-request-status.enum';

export class ProposeStatusDto {
  @ApiProperty({
    enum: [
      ServiceRequestStatus.ACCEPTED,
      ServiceRequestStatus.IN_PROGRESS,
      ServiceRequestStatus.COMPLETED,
      ServiceRequestStatus.REFUSED,
    ],
    example: ServiceRequestStatus.ACCEPTED,
  })
  @IsEnum(ServiceRequestStatus)
  toStatus!: ServiceRequestStatus;

  @ApiPropertyOptional({ example: 'I can start tomorrow at 10AM.' })
  @IsOptional()
  @IsString()
  reason?: string;
}
