import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';
import { SubCategoriesService } from './sub-categories.service';

@ApiTags('Sub-Categories')
@Controller('sub-categories')
export class SubCategoriesController {
  constructor(private readonly subCategoriesService: SubCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Public list of active sub-categories' })
  findAllPublic() {
    return this.subCategoriesService.findAllPublic();
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin list including soft-deleted sub-categories' })
  findAllAdmin() {
    return this.subCategoriesService.findAllAdmin();
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create sub-category (admin only)' })
  create(@Body() dto: CreateSubCategoryDto) {
    return this.subCategoriesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update sub-category (admin only)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubCategoryDto,
  ) {
    return this.subCategoriesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete sub-category (admin only)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.subCategoriesService.remove(id);
  }
}
