import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { PriceMode } from '../../common/enums/price-mode.enum';
import { Category } from './category.entity';
import { ServiceRequest } from './service-request.entity';
import { SubCategory } from './sub-category.entity';
import { User } from './user.entity';

@Entity('services')
export class Service extends BaseEntity {
  @ManyToOne(() => User, (user) => user.providedServices, { nullable: false })
  provider!: User;

  @ManyToOne(() => Category, (category) => category.services, { nullable: false })
  category!: Category;

  @ManyToOne(() => SubCategory, (subCategory) => subCategory.services, {
    nullable: false,
  })
  subCategory!: SubCategory;

  @Column({ length: 140 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ length: 120 })
  region!: string;

  @Column({ type: 'varchar', length: 10, default: PriceMode.FIXED })
  priceMode!: PriceMode;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price!: number | null;

  @Column({ type: 'varchar', length: 3, default: 'TND' })
  currency!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  isHidden!: boolean;

  @Column({ type: 'simple-json', nullable: true })
  imageUrls!: string[] | null;

  @OneToMany(() => ServiceRequest, (request) => request.service)
  requests!: ServiceRequest[];
}
