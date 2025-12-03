import { Test, TestingModule } from '@nestjs/testing';
import { TrpcController } from './trpc.controller';
import { TrpcService } from './trpc.service';

describe('TrpcController', () => {
  let controller: TrpcController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrpcController],
      providers: [TrpcService],
    }).compile();

    controller = module.get<TrpcController>(TrpcController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
