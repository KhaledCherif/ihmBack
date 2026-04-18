import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ConflictCase,
  Service,
  ServiceRequest,
  ServiceRequestStatusHistory,
  User,
} from '../database/entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  imports: [
    NotificationsModule,
    TypeOrmModule.forFeature([
      ServiceRequest,
      Service,
      User,
      ServiceRequestStatusHistory,
      ConflictCase,
    ]),
  ],
  controllers: [RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
