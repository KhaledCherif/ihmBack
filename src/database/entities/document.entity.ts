import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { DocumentType } from '../../common/enums/document-type.enum';
import { User } from './user.entity';

@Entity('documents')
export class Document extends BaseEntity {
  @ManyToOne(() => User, (user) => user.documents, { nullable: false })
  provider!: User;

  @Column({ type: 'varchar', length: 30 })
  type!: DocumentType;

  @Column({ type: 'varchar', length: 255 })
  filePath!: string;

  @Column({ type: 'varchar', length: 120 })
  mimeType!: string;

  @Column({ type: 'int' })
  sizeBytes!: number;

  @Column({ type: 'boolean', nullable: true })
  isApproved!: boolean | null;

  @ManyToOne(() => User, { nullable: true })
  reviewedBy!: User | null;

  @Column({ type: 'text', nullable: true })
  reviewNote!: string | null;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt!: Date | null;
}
