import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Category, Service, SubCategory } from '../database/entities';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(SubCategory)
    private readonly subCategoryRepository: Repository<SubCategory>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  async create(dto: CreateCategoryDto) {
    const exists = await this.categoryRepository.findOne({
      where: { name: dto.name.trim() },
    });

    if (exists) {
      throw new BadRequestException('Category name already exists');
    }

    const category = this.categoryRepository.create({
      name: dto.name.trim(),
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });

    return this.categoryRepository.save(category);
  }

  findAllPublic() {
    return this.categoryRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  findAllAdmin() {
    return this.categoryRepository.find({
      withDeleted: true,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const category = await this.categoryRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.name && dto.name.trim() !== category.name) {
      const duplicate = await this.categoryRepository.findOne({
        where: { name: dto.name.trim(), id: Not(id) },
      });
      if (duplicate) {
        throw new BadRequestException('Category name already exists');
      }
      category.name = dto.name.trim();
    }

    if (dto.sortOrder !== undefined) {
      category.sortOrder = dto.sortOrder;
    }

    if (dto.isActive !== undefined) {
      category.isActive = dto.isActive;

      if (!dto.isActive) {
        await this.subCategoryRepository
          .createQueryBuilder()
          .update(SubCategory)
          .set({ isActive: false })
          .where('categoryId = :id', { id })
          .execute();

        await this.serviceRepository
          .createQueryBuilder()
          .update(Service)
          .set({ isActive: false })
          .where('categoryId = :id', { id })
          .execute();
      }
    }

    return this.categoryRepository.save(category);
  }

  async remove(id: number) {
    const category = await this.categoryRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.subCategoryRepository
      .createQueryBuilder()
      .softDelete()
      .where('categoryId = :id', { id })
      .execute();

    await this.serviceRepository
      .createQueryBuilder()
      .softDelete()
      .where('categoryId = :id', { id })
      .execute();

    await this.categoryRepository.softDelete(id);

    return { message: 'Category soft deleted' };
  }
}
