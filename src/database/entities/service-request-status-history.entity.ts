import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ServiceRequestStatus } from '../../common/enums/service-request-status.enum';
import { ServiceRequest } from './service-request.entity';
import { User } from './user.entity';

@Entity('service_request_status_history')
export class ServiceRequestStatusHistory extends BaseEntity {
  @ManyToOne(() => ServiceRequest, (request) => request.statusHistory, {
    nullable: false,
  })
  request!: ServiceRequest;

  @Column({ type: 'varchar', length: 30, nullable: true })
  fromStatus!: ServiceRequestStatus | null;

  @Column({ type: 'varchar', length: 30 })
  toStatus!: ServiceRequestStatus;

  @ManyToOne(() => User, { nullable: false })
  changedBy!: User;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;
}
