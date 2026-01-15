import { Injectable } from "@nestjs/common";
import { PortfolioRepository } from "./portfolio.repository";

@Injectable()
export class PortfolioService {
  constructor(private readonly repository: PortfolioRepository) {}

  async getPositions(userId: string): Promise<any[]> {
    const response = await this.repository.getPositions(userId);
    return response.data || [];
  }

  async getHoldings(userId: string): Promise<any[]> {
    const response = await this.repository.getHoldings(userId);
    return response.data || [];
  }

  async getFunds(userId: string): Promise<any> {
    const response = await this.repository.getFunds(userId);
    return response.data;
  }
}
