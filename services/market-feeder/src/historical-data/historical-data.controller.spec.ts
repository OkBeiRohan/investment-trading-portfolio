import { Test, TestingModule } from '@nestjs/testing';
import { HistoricalDataController } from './historical-data.controller';
import { HistoricalDataService } from './historical-data.service';

describe('HistoricalDataController', () => {
  let controller: HistoricalDataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HistoricalDataController],
      providers: [HistoricalDataService],
    }).compile();

    controller = module.get<HistoricalDataController>(HistoricalDataController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
