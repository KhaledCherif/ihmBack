import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category, Service, SubCategory } from '../database/entities';
import { SubCategoriesController } from './sub-categories.controller';
import { SubCategoriesService } from './sub-categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([SubCategory, Category, Service])],
  controllers: [SubCategoriesController],
  providers: [SubCategoriesService],
  exports: [SubCategoriesService],
})
export class SubCategoriesModule {}
