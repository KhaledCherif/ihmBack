import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, Service, SubCategory } from '../database/entities';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';

@Injectable()
export class SubCategoriesService {
  constructor(
    @InjectRepository(SubCategory)
    private readonly subCategoryRepository: Repository<SubCategory>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  async create(dto: CreateSubCategoryDto) {
    const category = await this.categoryRepository.findOne({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const duplicate = await this.subCategoryRepository.findOne({
      where: {
        name: dto.name.trim(),
        category: { id: dto.categoryId },
      },
      relations: { category: true },
    });

    if (duplicate) {
      throw new BadRequestException(
        'Sub-category name already exists under this category',
      );
    }

    const subCategory = this.subCategoryRepository.create({
      category,
      name: dto.name.trim(),
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
      requiresLicense: dto.requiresLicense ?? false,
    });

    return this.subCategoryRepository.save(subCategory);
  }

  findAllPublic() {
    return this.subCategoryRepository.find({
      where: { isActive: true, category: { isActive: true } },
      relations: { category: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  findAllAdmin() {
    return this.subCategoryRepository.find({
      withDeleted: true,
      relations: { category: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async update(id: number, dto: UpdateSubCategoryDto) {
    const subCategory = await this.subCategoryRepository.findOne({
      where: { id },
      relations: { category: true },
    });

    if (!subCategory) {
      throw new NotFoundException('Sub-category not found');
    }

    if (dto.categoryId && dto.categoryId !== subCategory.category.id) {
      const category = await this.categoryRepository.findOne({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
      subCategory.category = category;
    }

    if (dto.name !== undefined) {
      subCategory.name = dto.name.trim();
    }

    if (dto.sortOrder !== undefined) {
      subCategory.sortOrder = dto.sortOrder;
    }

    if (dto.requiresLicense !== undefined) {
      subCategory.requiresLicense = dto.requiresLicense;
    }

    if (dto.isActive !== undefined) {
      subCategory.isActive = dto.isActive;

      if (!dto.isActive) {
        await this.serviceRepository
          .createQueryBuilder()
          .update(Service)
          .set({ isActive: false })
          .where('subCategoryId = :id', { id })
          .execute();
      }
    }

    return this.subCategoryRepository.save(subCategory);
  }

  async remove(id: number) {
    const subCategory = await this.subCategoryRepository.findOne({ where: { id } });

    if (!subCategory) {
      throw new NotFoundException('Sub-category not found');
    }

    await this.serviceRepository
      .createQueryBuilder()
      .softDelete()
      .where('subCategoryId = :id', { id })
      .execute();

    await this.subCategoryRepository.softDelete(id);

    return { message: 'Sub-category soft deleted' };
  }

  async restore(id: number) {
    const subCategory = await this.subCategoryRepository.findOne({
      where: { id },
      withDeleted: true,
      relations: { category: true },
    });

    if (!subCategory) {
      throw new NotFoundException('Sub-category not found');
    }

    if (!subCategory.category || subCategory.category.deletedAt) {
      throw new BadRequestException(
        'Restore parent category before restoring this sub-category',
      );
    }

    if (!subCategory.deletedAt) {
      return { message: 'Sub-category is already active' };
    }

    await this.subCategoryRepository.restore(id);
    await this.subCategoryRepository.update(id, { isActive: true });

    return { message: 'Sub-category restored successfully' };
  }
}
