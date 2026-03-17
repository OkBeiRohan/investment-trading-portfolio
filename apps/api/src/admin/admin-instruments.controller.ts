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
} from "@nestjs/common";
import { AuthGuard, Session } from "@repo/authentication";
import { InstrumentRepository, AuditLogRepository } from "@repo/database";
import { AdminGuard } from "../guards/admin.guard";

@Controller("api/admin/instruments")
@UseGuards(AuthGuard, AdminGuard)
export class AdminInstrumentsController {
  private readonly logger = new Logger(AdminInstrumentsController.name);

  constructor(
    private readonly instrumentRepo: InstrumentRepository,
    private readonly auditLogRepo: AuditLogRepository,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async listInstruments(
    @Query("exchange") exchange?: string,
    @Query("segment") segment?: string,
    @Query("instrumentType") instrumentType?: string,
    @Query("tradingEnabled") tradingEnabled?: string,
    @Query("dataCollectionEnabled") dataCollectionEnabled?: string,
    @Query("search") search?: string,
    @Query("page") page = 1,
    @Query("limit") limit = 50,
  ) {
    const result = await this.instrumentRepo.findFiltered({
      exchange,
      segment,
      instrumentType,
      tradingEnabled:
        tradingEnabled !== undefined
          ? tradingEnabled === "true"
          : undefined,
      dataCollectionEnabled:
        dataCollectionEnabled !== undefined
          ? dataCollectionEnabled === "true"
          : undefined,
      isActive: true,
      search,
      page: +page,
      limit: Math.min(+limit, 200),
    });

    return {
      page: +page,
      limit: Math.min(+limit, 200),
      items: result.items,
      total: result.total,
    };
  }

  @Post("sync")
  @HttpCode(HttpStatus.OK)
  async syncInstruments(@Session() session: any) {
    this.logger.log(
      `Instrument sync requested by admin ${session.user.id}`,
    );

    await this.auditLogRepo.create({
      action: "admin.instruments.sync",
      category: "admin",
      userId: session.user.id,
    });

    return { syncing: true, message: "Instrument sync will run on next scheduler cycle" };
  }

  @Put(":instrumentKey/trading")
  @HttpCode(HttpStatus.OK)
  async updateTradingStatus(
    @Param("instrumentKey") instrumentKey: string,
    @Body() body: { enabled: boolean },
    @Session() session: any,
  ) {
    await this.instrumentRepo.updateTradingStatus(
      instrumentKey,
      body.enabled,
    );

    this.logger.log(
      `Admin ${session.user.id} set trading=${body.enabled} for ${instrumentKey}`,
    );

    await this.auditLogRepo.create({
      action: "admin.instruments.trading-status",
      category: "admin",
      userId: session.user.id,
      targetId: instrumentKey,
      targetType: "instrument",
      details: { enabled: body.enabled },
    });

    return { instrumentKey, tradingEnabled: body.enabled };
  }

  @Put(":instrumentKey/data-collection")
  @HttpCode(HttpStatus.OK)
  async updateDataCollection(
    @Param("instrumentKey") instrumentKey: string,
    @Body() body: { enabled: boolean },
    @Session() session: any,
  ) {
    await this.instrumentRepo.updateDataCollectionStatus(
      instrumentKey,
      body.enabled,
    );

    this.logger.log(
      `Admin ${session.user.id} set data-collection=${body.enabled} for ${instrumentKey}`,
    );

    await this.auditLogRepo.create({
      action: "admin.instruments.data-collection",
      category: "admin",
      userId: session.user.id,
      targetId: instrumentKey,
      targetType: "instrument",
      details: { enabled: body.enabled },
    });

    return { instrumentKey, dataCollectionEnabled: body.enabled };
  }

  @Put("bulk/trading")
  @HttpCode(HttpStatus.OK)
  async bulkUpdateTradingStatus(
    @Body() body: { instrumentKeys: string[]; enabled: boolean },
    @Session() session: any,
  ) {
    const modified = await this.instrumentRepo.bulkUpdateTradingStatus(
      body.instrumentKeys,
      body.enabled,
    );

    this.logger.log(
      `Admin ${session.user.id} bulk set trading=${body.enabled} for ${body.instrumentKeys.length} instruments`,
    );

    await this.auditLogRepo.create({
      action: "admin.instruments.bulk-trading-status",
      category: "admin",
      userId: session.user.id,
      details: {
        count: body.instrumentKeys.length,
        enabled: body.enabled,
      },
    });

    return { modified, enabled: body.enabled };
  }

  @Put("bulk/data-collection")
  @HttpCode(HttpStatus.OK)
  async bulkUpdateDataCollection(
    @Body() body: { instrumentKeys: string[]; enabled: boolean },
    @Session() session: any,
  ) {
    const modified =
      await this.instrumentRepo.bulkUpdateDataCollectionStatus(
        body.instrumentKeys,
        body.enabled,
      );

    this.logger.log(
      `Admin ${session.user.id} bulk set data-collection=${body.enabled} for ${body.instrumentKeys.length} instruments`,
    );

    await this.auditLogRepo.create({
      action: "admin.instruments.bulk-data-collection",
      category: "admin",
      userId: session.user.id,
      details: {
        count: body.instrumentKeys.length,
        enabled: body.enabled,
      },
    });

    return { modified, enabled: body.enabled };
  }
}
