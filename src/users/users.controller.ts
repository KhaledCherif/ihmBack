import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  ParseFilePipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { extname } from 'path';
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

  @Post('me/image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload or replace current user profile image' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = 'uploads/users';
          mkdirSync(uploadDir, { recursive: true });
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const isImage = /^image\/(jpeg|jpg|png|webp)$/i.test(file.mimetype);
        cb(
          isImage
            ? null
            : (new BadRequestException('Only image files are allowed') as unknown as Error),
          isImage,
        );
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadProfileImage(
    @CurrentUser() user: JwtPayload,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.usersService.uploadProfileImage(user.sub, file);
  }

  @Delete('me/image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete current user profile image' })
  @HttpCode(HttpStatus.OK)
  deleteProfileImage(@CurrentUser() user: JwtPayload) {
    return this.usersService.deleteProfileImage(user.sub);
  }
}
