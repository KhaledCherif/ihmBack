import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CategoriesModule } from './categories/categories.module';
import {
  Category,
  ConflictCase,
  Document,
  ProviderValidationLog,
  Review,
  Service,
  ServiceRequest,
  ServiceRequestStatusHistory,
  SubCategory,
  User,
} from './database/entities';
import { ServicesModule } from './services/services.module';
import { SubCategoriesModule } from './sub-categories/sub-categories.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DB_PATH ?? 'database.sqlite',
      entities: [
        User,
        Category,
        SubCategory,
        Service,
        ServiceRequest,
        ServiceRequestStatusHistory,
        Review,
        Document,
        ProviderValidationLog,
        ConflictCase,
      ],
      synchronize: true,
      logging: false,
    }),
    AuthModule,
    UsersModule,
    CategoriesModule,
    SubCategoriesModule,
    ServicesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
