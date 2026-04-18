import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ProviderValidationStatus } from '../../common/enums/provider-validation-status.enum';
import { ConflictCase } from './conflict-case.entity';
import { Document } from './document.entity';
import { ProviderValidationLog } from './provider-validation-log.entity';
import { Review } from './review.entity';
import { ServiceRequest } from './service-request.entity';
import { Service } from './service.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ length: 100 })
  name!: string;

  @Index({ unique: true })
  @Column({ length: 160 })
  email!: string;

  @Index({ unique: true })
  @Column({ length: 20 })
  phoneNumber!: string;

  @Column({ length: 255 })
  passwordHash!: string;

  @Column({ type: 'date' })
  dateOfBirth!: string;

  @Column({ length: 255 })
  address!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl!: string | null;

  @Column({ default: false })
  isAdmin!: boolean;

  @Column({ default: false })
  isProvider!: boolean;

  @Column({ default: false })
  isSuspended!: boolean;

  @Column({ type: 'text', nullable: true })
  suspendedReason!: string | null;

  @Column({ type: 'datetime', nullable: true })
  suspendedAt!: Date | null;

  @Column({ default: 0 })
  failedLoginAttempts!: number;

  @Column({ type: 'datetime', nullable: true })
  lockUntil!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  refreshTokenHash!: string | null;

  @Column({ type: 'text', nullable: true })
  emailVerificationTokenHash!: string | null;

  @Column({ type: 'datetime', nullable: true })
  emailVerificationExpiresAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  passwordResetTokenHash!: string | null;

  @Column({ type: 'datetime', nullable: true })
  passwordResetExpiresAt!: Date | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  providerValidationStatus!: ProviderValidationStatus | null;

  @Column({ default: 0 })
  hiddenReviewsCount!: number;

  @Column({ default: 0 })
  lostConflictsCount!: number;

  @Column({ default: true })
  emailNotificationsEnabled!: boolean;

  @OneToMany(() => Service, (service) => service.provider)
  providedServices!: Service[];

  @OneToMany(() => ServiceRequest, (request) => request.client)
  clientRequests!: ServiceRequest[];

  @OneToMany(() => ServiceRequest, (request) => request.provider)
  providerRequests!: ServiceRequest[];

  @OneToMany(() => Review, (review) => review.client)
  writtenReviews!: Review[];

  @OneToMany(() => Review, (review) => review.provider)
  receivedReviews!: Review[];

  @OneToMany(() => Document, (document) => document.provider)
  documents!: Document[];

  @OneToMany(() => ProviderValidationLog, (log) => log.provider)
  providerValidationLogs!: ProviderValidationLog[];

  @OneToMany(() => ConflictCase, (conflict) => conflict.reportedBy)
  reportedConflicts!: ConflictCase[];

  @OneToMany(() => ConflictCase, (conflict) => conflict.againstUser)
  conflictsAgainst!: ConflictCase[];
}
