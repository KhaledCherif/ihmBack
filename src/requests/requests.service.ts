import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ConflictStatus } from '../common/enums/conflict-status.enum';
import { ServiceRequestStatus } from '../common/enums/service-request-status.enum';
import {
  ConflictCase,
  Service,
  ServiceRequest,
  ServiceRequestStatusHistory,
  User,
} from '../database/entities';
import { NotificationsService } from '../notifications/notifications.service';
import { CancelRequestDto } from './dto/cancel-request.dto';
import { ConfirmProposedStatusDto } from './dto/confirm-proposed-status.dto';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { OpenConflictDto } from './dto/open-conflict.dto';
import { ProposeStatusDto } from './dto/propose-status.dto';
import { ResolveConflictDto } from './dto/resolve-conflict.dto';

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(ServiceRequest)
    private readonly requestRepository: Repository<ServiceRequest>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ServiceRequestStatusHistory)
    private readonly historyRepository: Repository<ServiceRequestStatusHistory>,
    @InjectRepository(ConflictCase)
    private readonly conflictRepository: Repository<ConflictCase>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(currentUser: JwtPayload, dto: CreateServiceRequestDto) {
    const client = await this.assertClientUser(currentUser);

    const service = await this.serviceRepository.findOne({
      where: {
        id: dto.serviceId,
        isActive: true,
        isHidden: false,
        provider: { isSuspended: false },
        category: { isActive: true },
        subCategory: { isActive: true },
      },
      relations: { provider: true, category: true, subCategory: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found or unavailable');
    }

    const request = this.requestRepository.create({
      service,
      client,
      provider: service.provider,
      scheduledAt: new Date(dto.scheduledAt),
      location: dto.location.trim(),
      notes: dto.notes?.trim() ?? null,
      status: ServiceRequestStatus.PENDING,
      providerProposedStatus: null,
      needsClientConfirmation: false,
      statusChangedAt: new Date(),
    });

    const savedRequest = await this.requestRepository.save(request);
    await this.writeHistory(
      savedRequest,
      null,
      ServiceRequestStatus.PENDING,
      client,
      'Request created by client',
    );

    await this.notifyRequestEvent(savedRequest, {
      event: 'Request created',
      status: savedRequest.status,
      message: 'A new service request has been created.',
      actorName: client.name,
    });

    return this.findOne(savedRequest.id, currentUser);
  }

  async findOne(id: number, currentUser: JwtPayload) {
    const request = await this.getRequestWithRelations(id);

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    const canAccess =
      currentUser.isAdmin ||
      request.client.id === currentUser.sub ||
      request.provider.id === currentUser.sub;

    if (!canAccess) {
      throw new ForbiddenException('You cannot access this request');
    }

    return request;
  }

  async listClientHistory(currentUser: JwtPayload) {
    const client = await this.assertClientUser(currentUser);

    return this.requestRepository.find({
      where: { client: { id: client.id } },
      relations: {
        service: true,
        provider: true,
        statusHistory: { changedBy: true },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async listProviderHistory(currentUser: JwtPayload) {
    const provider = await this.assertProviderUser(currentUser);

    return this.requestRepository.find({
      where: { provider: { id: provider.id } },
      relations: {
        service: true,
        client: true,
        statusHistory: { changedBy: true },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async proposeStatus(
    id: number,
    currentUser: JwtPayload,
    dto: ProposeStatusDto,
  ) {
    const provider = await this.assertProviderUser(currentUser);
    const request = await this.getRequestWithRelations(id);

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.provider.id !== provider.id) {
      throw new ForbiddenException('You can only manage your own requests');
    }

    if (this.isTerminalStatus(request.status)) {
      throw new BadRequestException('Cannot propose status change on terminal request');
    }

    if (
      dto.toStatus === ServiceRequestStatus.CANCELLED_BY_CLIENT ||
      dto.toStatus === ServiceRequestStatus.CANCELLED_BY_PROVIDER ||
      dto.toStatus === ServiceRequestStatus.DISPUTED ||
      dto.toStatus === ServiceRequestStatus.RESOLVED
    ) {
      throw new BadRequestException('Invalid proposed status');
    }

    request.providerProposedStatus = dto.toStatus;
    request.needsClientConfirmation = true;

    await this.requestRepository.save(request);

    await this.notifyRequestEvent(request, {
      event: 'Status proposed by provider',
      status: request.status,
      message: `Provider proposed status change to ${dto.toStatus}.`,
      actorName: provider.name,
    });

    return {
      message: 'Provider proposed a status change. Awaiting client confirmation.',
      proposedStatus: dto.toStatus,
      reason: dto.reason ?? null,
    };
  }

  async confirmProposedStatus(
    id: number,
    currentUser: JwtPayload,
    dto: ConfirmProposedStatusDto,
  ) {
    const client = await this.assertClientUser(currentUser);
    const request = await this.getRequestWithRelations(id);

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.client.id !== client.id) {
      throw new ForbiddenException('Only the client can confirm proposed status');
    }

    if (!request.needsClientConfirmation || !request.providerProposedStatus) {
      throw new BadRequestException('There is no pending provider proposal');
    }

    const proposedStatus = request.providerProposedStatus;

    if (dto.accept) {
      const fromStatus = request.status;
      request.status = proposedStatus;
      request.statusChangedAt = new Date();
      request.providerProposedStatus = null;
      request.needsClientConfirmation = false;

      await this.requestRepository.save(request);
      await this.writeHistory(
        request,
        fromStatus,
        proposedStatus,
        client,
        dto.reason ?? 'Client confirmed provider status proposal',
      );

      await this.notifyRequestEvent(request, {
        event: 'Status confirmed by client',
        status: request.status,
        message: `Client accepted provider proposal. New status: ${request.status}.`,
        actorName: client.name,
      });

      return {
        message: 'Provider proposed status has been confirmed',
        status: request.status,
      };
    }

    request.providerProposedStatus = null;
    request.needsClientConfirmation = false;
    await this.requestRepository.save(request);

    await this.notifyRequestEvent(request, {
      event: 'Status proposal rejected',
      status: request.status,
      message: 'Client rejected provider proposed status change.',
      actorName: client.name,
    });

    return {
      message: 'Provider proposed status has been rejected by client',
      status: request.status,
    };
  }

  async cancelByClient(id: number, currentUser: JwtPayload, dto: CancelRequestDto) {
    const client = await this.assertClientUser(currentUser);
    const request = await this.getRequestWithRelations(id);

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.client.id !== client.id) {
      throw new ForbiddenException('You can only cancel your own requests');
    }

    if (request.status !== ServiceRequestStatus.PENDING) {
      throw new BadRequestException('Client can cancel only pending requests');
    }

    const fromStatus = request.status;
    request.status = ServiceRequestStatus.CANCELLED_BY_CLIENT;
    request.statusChangedAt = new Date();
    request.providerProposedStatus = null;
    request.needsClientConfirmation = false;

    await this.requestRepository.save(request);
    await this.writeHistory(
      request,
      fromStatus,
      request.status,
      client,
      dto.reason ?? 'Cancelled by client',
    );

    await this.notifyRequestEvent(request, {
      event: 'Request cancelled by client',
      status: request.status,
      message: dto.reason ?? 'Client cancelled the request.',
      actorName: client.name,
    });

    return {
      message: 'Request cancelled by client',
      status: request.status,
    };
  }

  async cancelByProvider(
    id: number,
    currentUser: JwtPayload,
    dto: CancelRequestDto,
  ) {
    const provider = await this.assertProviderUser(currentUser);
    const request = await this.getRequestWithRelations(id);

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.provider.id !== provider.id) {
      throw new ForbiddenException('You can only cancel your own provider requests');
    }

    if (
      request.status === ServiceRequestStatus.CANCELLED_BY_CLIENT ||
      request.status === ServiceRequestStatus.CANCELLED_BY_PROVIDER
    ) {
      throw new BadRequestException('Request is already cancelled');
    }

    const fromStatus = request.status;
    request.status = ServiceRequestStatus.CANCELLED_BY_PROVIDER;
    request.statusChangedAt = new Date();
    request.providerProposedStatus = null;
    request.needsClientConfirmation = false;

    await this.requestRepository.save(request);
    await this.writeHistory(
      request,
      fromStatus,
      request.status,
      provider,
      dto.reason ?? 'Cancelled by provider',
    );

    await this.notifyRequestEvent(request, {
      event: 'Request cancelled by provider',
      status: request.status,
      message: dto.reason ?? 'Provider cancelled the request.',
      actorName: provider.name,
    });

    return {
      message: 'Request cancelled by provider',
      status: request.status,
    };
  }

  async openConflict(currentUser: JwtPayload, dto: OpenConflictDto) {
    const user = await this.userRepository.findOne({ where: { id: currentUser.sub } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const request = await this.getRequestWithRelations(dto.serviceRequestId);

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    const isClient = request.client.id === user.id;
    const isProvider = request.provider.id === user.id;

    if (!isClient && !isProvider) {
      throw new ForbiddenException('You are not part of this request');
    }

    const openConflictsCount = await this.conflictRepository.count({
      where: {
        serviceRequest: { id: request.id },
        status: ConflictStatus.OPEN,
      },
      relations: { serviceRequest: true },
    });

    if (openConflictsCount >= 2) {
      throw new BadRequestException(
        'Maximum open conflicts reached for this request',
      );
    }

    const againstUser = isClient ? request.provider : request.client;

    const conflict = this.conflictRepository.create({
      serviceRequest: request,
      reportedBy: user,
      againstUser,
      status: ConflictStatus.OPEN,
      proofByReporter: dto.proof,
      proofByAgainstUser: dto.additionalNotes?.trim() ?? null,
      adminDecision: null,
      loserUserId: null,
      resolvedAt: null,
    });

    const savedConflict = await this.conflictRepository.save(conflict);

    if (request.status !== ServiceRequestStatus.DISPUTED) {
      const fromStatus = request.status;
      request.status = ServiceRequestStatus.DISPUTED;
      request.statusChangedAt = new Date();
      request.providerProposedStatus = null;
      request.needsClientConfirmation = false;
      await this.requestRepository.save(request);
      await this.writeHistory(
        request,
        fromStatus,
        ServiceRequestStatus.DISPUTED,
        user,
        'Conflict opened',
      );

      await this.notifyRequestEvent(request, {
        event: 'Conflict opened',
        status: request.status,
        message: 'A conflict has been opened for this request and is pending admin resolution.',
        actorName: user.name,
      });
    }

    return {
      message: 'Conflict opened and sent to admin review',
      conflict: savedConflict,
    };
  }

  async listOpenConflicts(currentUser: JwtPayload) {
    if (!currentUser.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return this.conflictRepository.find({
      where: { status: ConflictStatus.OPEN },
      relations: {
        serviceRequest: true,
        reportedBy: true,
        againstUser: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async resolveConflict(
    conflictId: number,
    currentUser: JwtPayload,
    dto: ResolveConflictDto,
  ) {
    if (!currentUser.isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    const admin = await this.userRepository.findOne({ where: { id: currentUser.sub } });
    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }

    const conflict = await this.conflictRepository.findOne({
      where: { id: conflictId },
      relations: {
        serviceRequest: true,
        reportedBy: true,
        againstUser: true,
      },
    });

    if (!conflict) {
      throw new NotFoundException('Conflict not found');
    }

    if (conflict.status === ConflictStatus.RESOLVED) {
      throw new BadRequestException('Conflict already resolved');
    }

    const involvedUserIds = [conflict.reportedBy.id, conflict.againstUser.id];
    if (!involvedUserIds.includes(dto.loserUserId)) {
      throw new BadRequestException('loserUserId must be one of conflict participants');
    }

    conflict.status = ConflictStatus.RESOLVED;
    conflict.adminDecision = dto.adminDecision.trim();
    conflict.loserUserId = dto.loserUserId;
    conflict.resolvedAt = new Date();

    await this.conflictRepository.save(conflict);

    const request = await this.getRequestWithRelations(conflict.serviceRequest.id);
    if (request) {
      const fromStatus = request.status;
      request.status = ServiceRequestStatus.RESOLVED;
      request.statusChangedAt = new Date();
      request.providerProposedStatus = null;
      request.needsClientConfirmation = false;
      await this.requestRepository.save(request);
      await this.writeHistory(
        request,
        fromStatus,
        ServiceRequestStatus.RESOLVED,
        admin,
        `Conflict resolved by admin: ${dto.adminDecision.trim()}`,
      );

      await this.notifyRequestEvent(request, {
        event: 'Conflict resolved by admin',
        status: request.status,
        message: dto.adminDecision.trim(),
        actorName: admin.name,
      });
    }

    const loser = await this.userRepository.findOne({
      where: { id: dto.loserUserId },
    });

    if (!loser) {
      throw new NotFoundException('Loser user not found');
    }

    loser.lostConflictsCount += 1;
    if (loser.lostConflictsCount >= 5 && !loser.isSuspended) {
      loser.isSuspended = true;
      loser.suspendedReason = 'Auto-suspended after losing 5 conflict cases';
      loser.suspendedAt = new Date();
    }

    await this.userRepository.save(loser);

    return {
      message: 'Conflict resolved successfully',
      loserUserId: loser.id,
      loserConflictsCount: loser.lostConflictsCount,
      loserSuspended: loser.isSuspended,
    };
  }

  private async getRequestWithRelations(id: number) {
    return this.requestRepository.findOne({
      where: { id },
      relations: {
        service: true,
        client: true,
        provider: true,
        statusHistory: { changedBy: true },
      },
    });
  }

  private async writeHistory(
    request: ServiceRequest,
    fromStatus: ServiceRequestStatus | null,
    toStatus: ServiceRequestStatus,
    changedBy: User,
    reason: string,
  ) {
    const history = this.historyRepository.create({
      request,
      fromStatus,
      toStatus,
      changedBy,
      reason,
    });

    await this.historyRepository.save(history);
  }

  private async assertClientUser(currentUser: JwtPayload) {
    const user = await this.userRepository.findOne({ where: { id: currentUser.sub } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isAdmin) {
      throw new ForbiddenException('Admin cannot create client requests');
    }

    if (user.isSuspended) {
      throw new ForbiddenException('Suspended users cannot create requests');
    }

    return user;
  }

  private async assertProviderUser(currentUser: JwtPayload) {
    const user = await this.userRepository.findOne({ where: { id: currentUser.sub } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isProvider) {
      throw new ForbiddenException('Provider access required');
    }

    if (user.isSuspended) {
      throw new ForbiddenException('Suspended users cannot manage requests');
    }

    return user;
  }

  private isTerminalStatus(status: ServiceRequestStatus): boolean {
    return [
      ServiceRequestStatus.CANCELLED_BY_CLIENT,
      ServiceRequestStatus.CANCELLED_BY_PROVIDER,
      ServiceRequestStatus.RESOLVED,
    ].includes(status);
  }

  private async notifyRequestEvent(
    request: ServiceRequest,
    params: {
      event: string;
      status: ServiceRequestStatus;
      message: string;
      actorName?: string;
    },
  ) {
    const fullRequest = await this.getRequestWithRelations(request.id);
    if (!fullRequest) {
      return;
    }

    const recipients = [
      {
        email: fullRequest.client.email,
        enabled: fullRequest.client.emailNotificationsEnabled,
      },
      {
        email: fullRequest.provider.email,
        enabled: fullRequest.provider.emailNotificationsEnabled,
      },
    ]
      .filter((recipient) => recipient.enabled)
      .map((recipient) => recipient.email);

    if (recipients.length === 0) {
      return;
    }

    await this.notificationsService.sendRequestLifecycleNotification({
      to: recipients,
      requestId: fullRequest.id,
      event: params.event,
      status: params.status,
      message: params.message,
      actorName: params.actorName,
      serviceTitle: fullRequest.service.title,
    });
  }
}
