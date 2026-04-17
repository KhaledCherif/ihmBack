import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Category } from './category.entity';
import { Service } from './service.entity';

@Entity('sub_categories')
export class SubCategory extends BaseEntity {
  @ManyToOne(() => Category, (category) => category.subCategories, {
    nullable: false,
  })
  category!: Category;

  @Column({ length: 120 })
  name!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ default: false })
  requiresLicense!: boolean;

  @OneToMany(() => Service, (service) => service.subCategory)
  services!: Service[];
}
