import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ProviderGuard } from '../common/guards/provider.guard';
import { CreateServiceDto } from './dto/create-service.dto';
import { SearchServicesDto } from './dto/search-services.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({
    summary:
      'Public service search (filters, pagination, sorting, free text)',
  })
  search(@Query() dto: SearchServicesDto) {
    return this.servicesService.search(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, ProviderGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my services (provider only)' })
  listMyServices(@CurrentUser() user: JwtPayload) {
    return this.servicesService.listMyServices(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Public service details by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.servicesService.findOnePublic(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, ProviderGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create service (validated provider only)' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateServiceDto) {
    return this.servicesService.create(user, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, ProviderGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my service (provider owner only)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, user, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, ProviderGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete my service (provider owner only)' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.servicesService.remove(id, user);
  }
}
