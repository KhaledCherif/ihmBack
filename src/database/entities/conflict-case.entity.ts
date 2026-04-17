import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ConflictStatus } from '../../common/enums/conflict-status.enum';
import { ServiceRequest } from './service-request.entity';
import { User } from './user.entity';

@Entity('conflict_cases')
export class ConflictCase extends BaseEntity {
  @ManyToOne(() => ServiceRequest, { nullable: false })
  serviceRequest!: ServiceRequest;

  @ManyToOne(() => User, (user) => user.reportedConflicts, { nullable: false })
  reportedBy!: User;

  @ManyToOne(() => User, (user) => user.conflictsAgainst, { nullable: false })
  againstUser!: User;

  @Column({ type: 'varchar', length: 20, default: ConflictStatus.OPEN })
  status!: ConflictStatus;

  @Column({ type: 'text', nullable: true })
  proofByReporter!: string | null;

  @Column({ type: 'text', nullable: true })
  proofByAgainstUser!: string | null;

  @Column({ type: 'text', nullable: true })
  adminDecision!: string | null;

  @Column({ type: 'int', nullable: true })
  loserUserId!: number | null;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt!: Date | null;
}
