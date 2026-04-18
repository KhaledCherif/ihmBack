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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Public list of active categories' })
  findAllPublic() {
    return this.categoriesService.findAllPublic();
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin list including soft-deleted categories' })
  findAllAdmin() {
    return this.categoriesService.findAllAdmin();
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category (admin only)' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category (admin only)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete category (admin only)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}
