import { Test, TestingModule } from '@nestjs/testing';
import { HistoricalDataService } from './historical-data.service';

describe('HistoricalDataService', () => {
  let service: HistoricalDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HistoricalDataService],
    }).compile();

    service = module.get<HistoricalDataService>(HistoricalDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
