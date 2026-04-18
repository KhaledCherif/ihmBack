import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { unlink } from 'fs/promises';
import { basename, join } from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { DocumentType } from '../common/enums/document-type.enum';
import { PriceMode } from '../common/enums/price-mode.enum';
import { ProviderValidationStatus } from '../common/enums/provider-validation-status.enum';
import {
  Category,
  Document,
  Service as ServiceEntity,
  SubCategory,
  User,
} from '../database/entities';
import { CreateServiceDto } from './dto/create-service.dto';
import { SearchServicesDto } from './dto/search-services.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(SubCategory)
    private readonly subCategoryRepository: Repository<SubCategory>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
  ) {}

  async create(currentUser: JwtPayload, dto: CreateServiceDto) {
    const provider = await this.assertValidatedProvider(currentUser);
    const { category, subCategory } = await this.assertValidTaxonomy(
      dto.categoryId,
      dto.subCategoryId,
    );

    if (subCategory.requiresLicense) {
      const hasApprovedLicense = await this.documentRepository.exist({
        where: {
          provider: { id: provider.id },
          type: DocumentType.LICENSE,
          isApproved: true,
        },
        relations: { provider: true },
      });

      if (!hasApprovedLicense) {
        throw new ForbiddenException(
          'This service requires an approved license document',
        );
      }
    }

    const normalizedPrice = this.normalizePrice(dto.priceMode, dto.price);

    const service = this.serviceRepository.create({
      provider,
      category,
      subCategory,
      title: dto.title.trim(),
      description: dto.description.trim(),
      region: dto.region.trim(),
      priceMode: dto.priceMode,
      price: normalizedPrice,
      currency: (dto.currency ?? 'TND').toUpperCase(),
      imageUrls: dto.imageUrls ?? null,
      isActive: dto.isActive ?? true,
      isHidden: dto.isHidden ?? false,
    });

    return this.serviceRepository.save(service);
  }

  async listMyServices(currentUser: JwtPayload) {
    await this.assertProviderRole(currentUser);

    return this.serviceRepository.find({
      where: { provider: { id: currentUser.sub } },
      relations: { category: true, subCategory: true },
      withDeleted: true,
      order: { createdAt: 'DESC' },
    });
  }

  async findOnePublic(id: number) {
    const service = await this.serviceRepository.findOne({
      where: {
        id,
        isActive: true,
        isHidden: false,
        provider: { isSuspended: false },
        category: { isActive: true },
        subCategory: { isActive: true },
      },
      relations: { provider: true, category: true, subCategory: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  async search(dto: SearchServicesDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const sortBy = dto.sortBy ?? 'createdAt';
    const sortOrder = (dto.sortOrder ?? 'desc').toUpperCase() as 'ASC' | 'DESC';

    const qb = this.serviceRepository
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.provider', 'provider')
      .leftJoinAndSelect('service.category', 'category')
      .leftJoinAndSelect('service.subCategory', 'subCategory')
      .where('service.isActive = :active', { active: true })
      .andWhere('service.isHidden = :hidden', { hidden: false })
      .andWhere('provider.isSuspended = :suspended', { suspended: false })
      .andWhere('category.isActive = :categoryActive', { categoryActive: true })
      .andWhere('subCategory.isActive = :subActive', { subActive: true });

    if (dto.q) {
      qb.andWhere('(LOWER(service.title) LIKE :q OR LOWER(service.description) LIKE :q)', {
        q: `%${dto.q.toLowerCase()}%`,
      });
    }

    if (dto.region) {
      qb.andWhere('LOWER(service.region) LIKE :region', {
        region: `%${dto.region.toLowerCase()}%`,
      });
    }

    if (dto.categoryId) {
      qb.andWhere('category.id = :categoryId', { categoryId: dto.categoryId });
    }

    if (dto.subCategoryId) {
      qb.andWhere('subCategory.id = :subCategoryId', {
        subCategoryId: dto.subCategoryId,
      });
    }

    if (dto.priceMode) {
      qb.andWhere('service.priceMode = :priceMode', { priceMode: dto.priceMode });
    }

    if (dto.minPrice !== undefined) {
      qb.andWhere('service.price >= :minPrice', { minPrice: dto.minPrice });
    }

    if (dto.maxPrice !== undefined) {
      qb.andWhere('service.price <= :maxPrice', { maxPrice: dto.maxPrice });
    }

    const sortMap: Record<string, string> = {
      createdAt: 'service.createdAt',
      price: 'service.price',
      title: 'service.title',
    };

    qb.orderBy(sortMap[sortBy] ?? 'service.createdAt', sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: number, currentUser: JwtPayload, dto: UpdateServiceDto) {
    await this.assertProviderRole(currentUser);

    const service = await this.serviceRepository.findOne({
      where: { id },
      relations: { provider: true, category: true, subCategory: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.provider.id !== currentUser.sub) {
      throw new ForbiddenException('You can only update your own services');
    }

    if (dto.categoryId || dto.subCategoryId) {
      const { category, subCategory } = await this.assertValidTaxonomy(
        dto.categoryId ?? service.category.id,
        dto.subCategoryId ?? service.subCategory.id,
      );
      service.category = category;
      service.subCategory = subCategory;
    }

    if (dto.title !== undefined) {
      service.title = dto.title.trim();
    }

    if (dto.description !== undefined) {
      service.description = dto.description.trim();
    }

    if (dto.region !== undefined) {
      service.region = dto.region.trim();
    }

    if (dto.priceMode !== undefined || dto.price !== undefined) {
      const nextPriceMode = dto.priceMode ?? service.priceMode;
      const normalizedPrice = this.normalizePrice(
        nextPriceMode,
        dto.price ?? service.price ?? undefined,
      );
      service.priceMode = nextPriceMode;
      service.price = normalizedPrice;
    }

    if (dto.currency !== undefined) {
      service.currency = dto.currency.toUpperCase();
    }

    if (dto.imageUrls !== undefined) {
      service.imageUrls = dto.imageUrls;
    }

    if (dto.isActive !== undefined) {
      service.isActive = dto.isActive;
    }

    if (dto.isHidden !== undefined) {
      service.isHidden = dto.isHidden;
    }

    return this.serviceRepository.save(service);
  }

  async remove(id: number, currentUser: JwtPayload) {
    await this.assertProviderRole(currentUser);

    const service = await this.serviceRepository.findOne({
      where: { id },
      relations: { provider: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.provider.id !== currentUser.sub) {
      throw new ForbiddenException('You can only remove your own services');
    }

    await this.serviceRepository.softDelete(id);

    return { message: 'Service soft deleted' };
  }

  async restore(id: number) {
    const service = await this.serviceRepository.findOne({
      where: { id },
      withDeleted: true,
      relations: { category: true, subCategory: true, provider: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (!service.deletedAt) {
      return { message: 'Service is already active' };
    }

    if (service.provider.isSuspended) {
      throw new BadRequestException('Cannot restore service of suspended provider');
    }

    if (service.category.deletedAt || service.subCategory.deletedAt) {
      throw new BadRequestException(
        'Restore category and sub-category before restoring this service',
      );
    }

    await this.serviceRepository.restore(id);
    await this.serviceRepository.update(id, {
      isActive: true,
      isHidden: false,
    });

    return { message: 'Service restored successfully' };
  }

  async uploadImages(
    id: number,
    currentUser: JwtPayload,
    files: Express.Multer.File[],
  ) {
    await this.assertProviderRole(currentUser);

    const service = await this.serviceRepository.findOne({
      where: { id },
      relations: { provider: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.provider.id !== currentUser.sub) {
      throw new ForbiddenException('You can only upload images for your own services');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image is required');
    }

    const uploaded = files.map((file) => `uploads/services/${file.filename}`);
    const existing = service.imageUrls ?? [];

    if (existing.length + uploaded.length > 5) {
      throw new BadRequestException('A service can have at most 5 images');
    }

    service.imageUrls = [...existing, ...uploaded];

    const saved = await this.serviceRepository.save(service);

    return {
      message: 'Images uploaded successfully',
      imageUrls: saved.imageUrls,
    };
  }

  async deleteImage(id: number, currentUser: JwtPayload, imageName: string) {
    await this.assertProviderRole(currentUser);

    const service = await this.serviceRepository.findOne({
      where: { id },
      relations: { provider: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (service.provider.id !== currentUser.sub) {
      throw new ForbiddenException('You can only delete images for your own services');
    }

    const sanitizedFileName = basename(imageName);
    if (!sanitizedFileName) {
      throw new BadRequestException('Invalid image name');
    }

    const existing = service.imageUrls ?? [];
    const targetPath = `uploads/services/${sanitizedFileName}`;

    if (!existing.includes(targetPath)) {
      throw new NotFoundException('Image not found in this service gallery');
    }

    service.imageUrls = existing.filter((path) => path !== targetPath);
    await this.serviceRepository.save(service);

    const absolutePath = join(process.cwd(), targetPath);
    try {
      await unlink(absolutePath);
    } catch {
      // If file is already missing on disk, DB state remains correct.
    }

    return {
      message: 'Image deleted successfully',
      imageUrls: service.imageUrls,
    };
  }

  private async assertProviderRole(currentUser: JwtPayload): Promise<void> {
    if (!currentUser.isProvider) {
      throw new ForbiddenException('Provider access required');
    }
  }

  private async assertValidatedProvider(currentUser: JwtPayload) {
    await this.assertProviderRole(currentUser);

    const provider = await this.userRepository.findOne({
      where: { id: currentUser.sub },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (provider.isSuspended) {
      throw new ForbiddenException('Suspended accounts cannot create services');
    }

    if (provider.providerValidationStatus !== ProviderValidationStatus.VALIDATED) {
      throw new ForbiddenException(
        'Provider account must be validated before creating services',
      );
    }

    return provider;
  }

  private async assertValidTaxonomy(categoryId: number, subCategoryId: number) {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, isActive: true },
    });

    if (!category) {
      throw new BadRequestException('Category not found or inactive');
    }

    const subCategory = await this.subCategoryRepository.findOne({
      where: { id: subCategoryId, isActive: true, category: { id: categoryId } },
      relations: { category: true },
    });

    if (!subCategory) {
      throw new BadRequestException(
        'Sub-category not found, inactive, or not linked to this category',
      );
    }

    return { category, subCategory };
  }

  private normalizePrice(priceMode: PriceMode, price?: number): number | null {
    if (priceMode === PriceMode.FREE) {
      return null;
    }

    if (price === undefined || Number.isNaN(price)) {
      throw new BadRequestException('Price is required for non-free services');
    }

    if (price < 0) {
      throw new BadRequestException('Price must be greater than or equal to 0');
    }

    return price;
  }
}
