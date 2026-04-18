import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CancelRequestDto } from './dto/cancel-request.dto';
import { ConfirmProposedStatusDto } from './dto/confirm-proposed-status.dto';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { OpenConflictDto } from './dto/open-conflict.dto';
import { ProposeStatusDto } from './dto/propose-status.dto';
import { ResolveConflictDto } from './dto/resolve-conflict.dto';
import { RequestsService } from './requests.service';

@ApiTags('Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Create service request (client flow)' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Admin/suspended users are not allowed' })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateServiceRequestDto,
  ) {
    return this.requestsService.create(user, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get request details for owner/admin' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  getOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.requestsService.findOne(id, user);
  }

  @Get('client/me/history')
  @ApiOperation({ summary: 'Client request history' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  listClientHistory(@CurrentUser() user: JwtPayload) {
    return this.requestsService.listClientHistory(user);
  }

  @Get('provider/me/history')
  @ApiOperation({ summary: 'Provider missions history' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Provider role required' })
  listProviderHistory(@CurrentUser() user: JwtPayload) {
    return this.requestsService.listProviderHistory(user);
  }

  @Patch(':id/provider/propose-status')
  @ApiOperation({ summary: 'Provider proposes status change (awaiting client confirmation)' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Provider ownership required' })
  proposeStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ProposeStatusDto,
  ) {
    return this.requestsService.proposeStatus(id, user, dto);
  }

  @Patch(':id/client/confirm-proposal')
  @ApiOperation({ summary: 'Client confirms or rejects provider proposed status' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Client ownership required' })
  confirmProposedStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ConfirmProposedStatusDto,
  ) {
    return this.requestsService.confirmProposedStatus(id, user, dto);
  }

  @Patch(':id/client/cancel')
  @ApiOperation({ summary: 'Client cancels request (pending only)' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Client ownership required' })
  cancelByClient(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CancelRequestDto,
  ) {
    return this.requestsService.cancelByClient(id, user, dto);
  }

  @Patch(':id/provider/cancel')
  @ApiOperation({ summary: 'Provider cancels request' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Provider ownership required' })
  cancelByProvider(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CancelRequestDto,
  ) {
    return this.requestsService.cancelByProvider(id, user, dto);
  }

  @Post('conflicts')
  @ApiOperation({ summary: 'Open conflict on a request (client/provider)' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Only request participants can open conflict' })
  openConflict(@CurrentUser() user: JwtPayload, @Body() dto: OpenConflictDto) {
    return this.requestsService.openConflict(user, dto);
  }

  @Get('admin/conflicts/open')
  @ApiOperation({ summary: 'Admin list of open conflicts' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  listOpenConflicts(@CurrentUser() user: JwtPayload) {
    return this.requestsService.listOpenConflicts(user);
  }

  @Patch('admin/conflicts/:id/resolve')
  @ApiOperation({ summary: 'Admin resolves conflict and updates loser counters' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  resolveConflict(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ResolveConflictDto,
  ) {
    return this.requestsService.resolveConflict(id, user, dto);
  }
}
