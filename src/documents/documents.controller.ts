import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AdminGuard } from '../common/guards/admin.guard';
import { ProviderGuard } from '../common/guards/provider.guard';
import { DocumentsService } from './documents.service';
import { ProviderValidationDecisionDto } from './dto/provider-validation-decision.dto';
import { UploadDocumentsDto } from './dto/upload-documents.dto';

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('me/upload')
  @UseGuards(JwtAuthGuard, ProviderGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload provider verification documents (PDF/images only, multiple files)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['id_card', 'diploma', 'license'],
        },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['type', 'files'],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Provider role required' })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = 'uploads/documents';
          mkdirSync(uploadDir, { recursive: true });
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const isAllowed = /^(application\/pdf|image\/(jpeg|jpg|png|webp))$/i.test(
          file.mimetype,
        );
        cb(
          isAllowed
            ? null
            : (new BadRequestException(
                'Only PDF and image files are allowed',
              ) as unknown as Error),
          isAllowed,
        );
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  @HttpCode(HttpStatus.OK)
  uploadMyDocuments(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UploadDocumentsDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
  ) {
    return this.documentsService.uploadMyDocuments(user, dto, files);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, ProviderGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my uploaded verification documents' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Provider role required' })
  listMyDocuments(@CurrentUser() user: JwtPayload) {
    return this.documentsService.listMyDocuments(user);
  }

  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List pending provider documents (admin only)' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  listPendingDocumentsForAdmin() {
    return this.documentsService.listPendingDocumentsForAdmin();
  }

  @Get('admin/providers/:providerId/history')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get provider validation decision history (admin only)' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  getProviderValidationHistory(
    @Param('providerId', ParseIntPipe) providerId: number,
  ) {
    return this.documentsService.getProviderValidationHistory(providerId);
  }

  @Patch('admin/providers/:providerId/review')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Approve or reject all pending documents for one provider (admin only)',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  reviewProviderDocuments(
    @Param('providerId', ParseIntPipe) providerId: number,
    @Body() dto: ProviderValidationDecisionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documentsService.reviewProviderDocuments(providerId, dto, user);
  }
}
