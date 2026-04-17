import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Service } from './service.entity';
import { SubCategory } from './sub-category.entity';

@Entity('categories')
export class Category extends BaseEntity {
  @Column({ length: 120, unique: true })
  name!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @OneToMany(() => SubCategory, (subCategory) => subCategory.category)
  subCategories!: SubCategory[];

  @OneToMany(() => Service, (service) => service.category)
  services!: Service[];
}
