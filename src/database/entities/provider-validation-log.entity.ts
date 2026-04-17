import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ProviderValidationDecision } from '../../common/enums/provider-validation-decision.enum';
import { User } from './user.entity';

@Entity('provider_validation_logs')
export class ProviderValidationLog extends BaseEntity {
  @ManyToOne(() => User, (user) => user.providerValidationLogs, {
    nullable: false,
  })
  provider!: User;

  @ManyToOne(() => User, { nullable: false })
  reviewedBy!: User;

  @Column({ type: 'varchar', length: 20 })
  decision!: ProviderValidationDecision;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;
}
