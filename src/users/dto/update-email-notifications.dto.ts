import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateEmailNotificationsDto {
  @ApiProperty({
    example: false,
    description: 'Enable/disable lifecycle email notifications for this user',
  })
  @IsBoolean()
  enabled!: boolean;
}
