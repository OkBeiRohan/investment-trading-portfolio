import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { HistoricalCandleRequest } from "./dto/historical.request.dto";

@Injectable()
export class HistoricalApiRepository {
  constructor(private readonly apiClient: HttpService) {}

  async getHistoricalData(request: HistoricalCandleRequest, userId: string) {}
}
