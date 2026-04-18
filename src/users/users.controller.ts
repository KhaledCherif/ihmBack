import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UpdateEmailNotificationsDto } from './dto/update-email-notifications.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiOkResponse({
    description: 'Current user profile',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          id: 12,
          name: 'Ali Ben Salah',
          email: 'ali@example.com',
          phoneNumber: '+21620111222',
          dateOfBirth: '2000-05-12',
          address: 'Tunis, Tunisia',
          imageUrl: null,
          isAdmin: false,
          isProvider: false,
          isSuspended: false,
          providerValidationStatus: null,
          emailVerifiedAt: '2026-04-18T14:27:00.000Z',
          emailNotificationsEnabled: true,
        },
      },
    },
  })
  me(@CurrentUser() user: JwtPayload) {
    return this.usersService.getMyProfile(user.sub);
  }

  @Patch('me/notifications/email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update email notification preference for current user' })
  @ApiOkResponse({
    description: 'Email notification preference updated',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          message: 'Email notification preference updated',
          emailNotificationsEnabled: false,
        },
      },
    },
  })
  updateEmailNotifications(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateEmailNotificationsDto,
  ) {
    return this.usersService.updateEmailNotifications(user.sub, dto.enabled);
  }
}
