import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
