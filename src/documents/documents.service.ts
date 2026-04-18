import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ProviderValidationDecision } from '../common/enums/provider-validation-decision.enum';
import { ProviderValidationStatus } from '../common/enums/provider-validation-status.enum';
import { Document, ProviderValidationLog, User } from '../database/entities';
import { IsNull, Repository } from 'typeorm';
import { ProviderValidationDecisionDto } from './dto/provider-validation-decision.dto';
import { UploadDocumentsDto } from './dto/upload-documents.dto';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ProviderValidationLog)
    private readonly providerValidationLogRepository: Repository<ProviderValidationLog>,
  ) {}

  async uploadMyDocuments(
    currentUser: JwtPayload,
    dto: UploadDocumentsDto,
    files: Express.Multer.File[],
  ) {
    const provider = await this.userRepository.findOne({
      where: { id: currentUser.sub },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    if (!provider.isProvider) {
      throw new ForbiddenException('Provider access required');
    }

    if (provider.isSuspended) {
      throw new ForbiddenException('Suspended providers cannot upload documents');
    }

    const documents = files.map((file) =>
      this.documentRepository.create({
        provider,
        type: dto.type,
        filePath: `uploads/documents/${file.filename}`,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        isApproved: null,
        reviewedBy: null,
        reviewNote: null,
        reviewedAt: null,
      }),
    );

    await this.documentRepository.save(documents);

    if (
      provider.providerValidationStatus === null ||
      provider.providerValidationStatus === ProviderValidationStatus.REJECTED
    ) {
      provider.providerValidationStatus = ProviderValidationStatus.PENDING;
      await this.userRepository.save(provider);
    }

    return {
      message: 'Documents uploaded successfully',
      uploadedCount: documents.length,
      providerValidationStatus: provider.providerValidationStatus,
      documents: documents.map((document) => ({
        id: document.id,
        type: document.type,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        isApproved: document.isApproved,
        uploadedAt: document.createdAt,
      })),
    };
  }

  async listMyDocuments(currentUser: JwtPayload) {
    const documents = await this.documentRepository.find({
      where: { provider: { id: currentUser.sub } },
      relations: { reviewedBy: true },
      order: { createdAt: 'DESC' },
    });

    return documents.map((document) => ({
      id: document.id,
      type: document.type,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      isApproved: document.isApproved,
      reviewNote: document.reviewNote,
      reviewedAt: document.reviewedAt,
      reviewedBy: document.reviewedBy
        ? {
            id: document.reviewedBy.id,
            name: document.reviewedBy.name,
            email: document.reviewedBy.email,
          }
        : null,
      uploadedAt: document.createdAt,
    }));
  }

  async listPendingDocumentsForAdmin() {
    const documents = await this.documentRepository.find({
      where: { isApproved: IsNull() },
      relations: { provider: true },
      order: { createdAt: 'ASC' },
    });

    return documents.map((document) => ({
      id: document.id,
      type: document.type,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      uploadedAt: document.createdAt,
      provider: {
        id: document.provider.id,
        name: document.provider.name,
        email: document.provider.email,
        phoneNumber: document.provider.phoneNumber,
        providerValidationStatus: document.provider.providerValidationStatus,
      },
    }));
  }

  async getProviderValidationHistory(providerId: number) {
    const provider = await this.userRepository.findOne({
      where: { id: providerId, isProvider: true },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const logs = await this.providerValidationLogRepository.find({
      where: { provider: { id: provider.id } },
      relations: { reviewedBy: true },
      order: { createdAt: 'DESC' },
    });

    return {
      provider: {
        id: provider.id,
        name: provider.name,
        email: provider.email,
        providerValidationStatus: provider.providerValidationStatus,
      },
      history: logs.map((log) => ({
        id: log.id,
        decision: log.decision,
        reason: log.reason,
        decidedAt: log.createdAt,
        reviewedBy: {
          id: log.reviewedBy.id,
          name: log.reviewedBy.name,
          email: log.reviewedBy.email,
        },
      })),
    };
  }

  async reviewProviderDocuments(
    providerId: number,
    dto: ProviderValidationDecisionDto,
    currentUser: JwtPayload,
  ) {
    const reviewer = await this.userRepository.findOne({
      where: { id: currentUser.sub },
    });

    if (!reviewer || !reviewer.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    const provider = await this.userRepository.findOne({
      where: { id: providerId },
    });

    if (!provider || !provider.isProvider) {
      throw new NotFoundException('Provider not found');
    }

    const pendingDocuments = await this.documentRepository.find({
      where: {
        provider: { id: provider.id },
        isApproved: IsNull(),
      },
      relations: { provider: true },
    });

    if (pendingDocuments.length === 0) {
      throw new BadRequestException('No pending documents found for this provider');
    }

    if (
      dto.decision === ProviderValidationDecision.REJECTED &&
      (!dto.reason || dto.reason.trim().length === 0)
    ) {
      throw new BadRequestException('A rejection reason is required');
    }

    const approved = dto.decision === ProviderValidationDecision.APPROVED;
    const reviewedAt = new Date();

    for (const document of pendingDocuments) {
      document.isApproved = approved;
      document.reviewedBy = reviewer;
      document.reviewedAt = reviewedAt;
      document.reviewNote = dto.reason?.trim() || null;
    }

    await this.documentRepository.save(pendingDocuments);

    provider.providerValidationStatus = approved
      ? ProviderValidationStatus.VALIDATED
      : ProviderValidationStatus.REJECTED;
    await this.userRepository.save(provider);

    await this.providerValidationLogRepository.save(
      this.providerValidationLogRepository.create({
        provider,
        reviewedBy: reviewer,
        decision: dto.decision,
        reason: dto.reason?.trim() || null,
      }),
    );

    return {
      message: approved
        ? 'Provider validated successfully'
        : 'Provider validation rejected',
      providerId: provider.id,
      providerValidationStatus: provider.providerValidationStatus,
      reviewedDocumentsCount: pendingDocuments.length,
      decision: dto.decision,
      reason: dto.reason?.trim() || null,
    };
  }
}
