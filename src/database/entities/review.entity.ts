import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ServiceRequest } from './service-request.entity';
import { User } from './user.entity';

@Entity('reviews')
export class Review extends BaseEntity {
  @OneToOne(() => ServiceRequest, { nullable: false })
  @JoinColumn()
  serviceRequest!: ServiceRequest;

  @ManyToOne(() => User, (user) => user.writtenReviews, { nullable: false })
  client!: User;

  @ManyToOne(() => User, (user) => user.receivedReviews, { nullable: false })
  provider!: User;

  @Column({ type: 'int' })
  score!: number;

  @Column({ type: 'text' })
  comment!: string;

  @Column({ default: false })
  isHidden!: boolean;

  @Column({ type: 'text', nullable: true })
  hiddenReason!: string | null;

  @ManyToOne(() => User, { nullable: true })
  hiddenBy!: User | null;

  @Column({ type: 'datetime', nullable: true })
  hiddenAt!: Date | null;
}
