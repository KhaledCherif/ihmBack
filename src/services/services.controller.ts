import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  ParseFilePipe,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
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
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AdminGuard } from '../common/guards/admin.guard';
import { ProviderGuard } from '../common/guards/provider.guard';
import { CreateServiceDto } from './dto/create-service.dto';
import { SearchServicesDto } from './dto/search-services.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({
    summary:
      'Public service search (filters, pagination, sorting, free text)',
  })
  search(@Query() dto: SearchServicesDto) {
    return this.servicesService.search(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, ProviderGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my services (provider only)' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Provider role required' })
  listMyServices(@CurrentUser() user: JwtPayload) {
    return this.servicesService.listMyServices(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Public service details by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.servicesService.findOnePublic(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, ProviderGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create service (validated provider only)' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Provider role and validation required' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateServiceDto) {
    return this.servicesService.create(user, dto);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, ProviderGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload service images (provider owner only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['files'],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Provider ownership required' })
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = 'uploads/services';
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
        cb(isImage ? null : new Error('Only image files are allowed'), isImage);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  @HttpCode(HttpStatus.OK)
  uploadImages(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
  ) {
    return this.servicesService.uploadImages(id, user, files);
  }

  @Delete(':id/images/:imageName')
  @UseGuards(JwtAuthGuard, ProviderGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete one service image (provider owner only)' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Provider ownership required' })
  deleteImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageName') imageName: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.servicesService.deleteImage(id, user, imageName);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, ProviderGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my service (provider owner only)' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Provider ownership required' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, user, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, ProviderGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete my service (provider owner only)' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Provider ownership required' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.servicesService.remove(id, user);
  }

  @Patch('admin/:id/restore')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore soft-deleted service (admin only)' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.servicesService.restore(id);
  }
}
