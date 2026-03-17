import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, Session } from '@repo/authentication';
import { InstrumentRepository, AuditLogRepository } from '@repo/database';

@Controller('api/admin/instruments')
@UseGuards(AuthGuard)
export class AdminInstrumentsController {
  private readonly logger = new Logger(AdminInstrumentsController.name);

  constructor(
    private readonly instrumentRepo: InstrumentRepository,
    private readonly auditLogRepo: AuditLogRepository,
  ) {}

  /**
   * List instruments with optional filters.
   * @route GET /api/admin/instruments
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async listInstruments(
    @Query('exchange') exchange?: string,
    @Query('segment') segment?: string,
    @Query('status') status?: string,
    @Query('tradingEnabled') tradingEnabled?: string,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    // TODO: Implement filtered/paginated instrument listing
    return { page: +page, limit: +limit, items: [], total: 0 };
  }

  /**
   * Trigger market-feeder instrument sync.
   * @route POST /api/admin/instruments/sync
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async syncInstruments(@Session() session: any) {
    this.logger.log(`Instrument sync requested by admin ${session.user.id}`);

    await this.auditLogRepo.create({
      action: 'admin.instruments.sync',
      category: 'admin',
      userId: session.user.id,
    });

    // TODO: Trigger market-feeder instrument sync via event/message
    return { syncing: true };
  }

  /**
   * Enable or disable trading for a specific instrument.
   * @route PUT /api/admin/instruments/:instrumentKey/trading
   */
  @Put(':instrumentKey/trading')
  @HttpCode(HttpStatus.OK)
  async updateTradingStatus(
    @Param('instrumentKey') instrumentKey: string,
    @Body() body: { enabled: boolean },
    @Session() session: any,
  ) {
    // TODO: Update instrument trading status
    this.logger.log(
      `Admin ${session.user.id} set trading=${body.enabled} for instrument ${instrumentKey}`,
    );

    await this.auditLogRepo.create({
      action: 'admin.instruments.trading-status',
      category: 'admin',
      userId: session.user.id,
      targetId: instrumentKey,
      targetType: 'instrument',
      details: { enabled: body.enabled },
    });

    return { instrumentKey, tradingEnabled: body.enabled };
  }

  /**
   * Enable or disable data collection for a specific instrument.
   * @route PUT /api/admin/instruments/:instrumentKey/data-collection
   */
  @Put(':instrumentKey/data-collection')
  @HttpCode(HttpStatus.OK)
  async updateDataCollection(
    @Param('instrumentKey') instrumentKey: string,
    @Body() body: { enabled: boolean },
    @Session() session: any,
  ) {
    // TODO: Update instrument data-collection flag
    this.logger.log(
      `Admin ${session.user.id} set data-collection=${body.enabled} for instrument ${instrumentKey}`,
    );

    await this.auditLogRepo.create({
      action: 'admin.instruments.data-collection',
      category: 'admin',
      userId: session.user.id,
      targetId: instrumentKey,
      targetType: 'instrument',
      details: { enabled: body.enabled },
    });

    return { instrumentKey, dataCollectionEnabled: body.enabled };
  }
}
