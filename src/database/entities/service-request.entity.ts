import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ServiceRequestStatus } from '../../common/enums/service-request-status.enum';
import { Service } from './service.entity';
import { ServiceRequestStatusHistory } from './service-request-status-history.entity';
import { User } from './user.entity';

@Entity('service_requests')
export class ServiceRequest extends BaseEntity {
  @ManyToOne(() => Service, (service) => service.requests, { nullable: false })
  service!: Service;

  @ManyToOne(() => User, (user) => user.clientRequests, { nullable: false })
  client!: User;

  @ManyToOne(() => User, (user) => user.providerRequests, { nullable: false })
  provider!: User;

  @Column({ type: 'datetime' })
  scheduledAt!: Date;

  @Column({ type: 'varchar', length: 255 })
  location!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'varchar', length: 30, default: ServiceRequestStatus.PENDING })
  status!: ServiceRequestStatus;

  @Column({ type: 'varchar', length: 30, nullable: true })
  providerProposedStatus!: ServiceRequestStatus | null;

  @Column({ default: false })
  needsClientConfirmation!: boolean;

  @Column({ type: 'datetime', nullable: true })
  statusChangedAt!: Date | null;

  @OneToMany(() => ServiceRequestStatusHistory, (history) => history.request)
  statusHistory!: ServiceRequestStatusHistory[];
}
