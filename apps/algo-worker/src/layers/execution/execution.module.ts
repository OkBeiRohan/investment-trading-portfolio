import { Module } from '@nestjs/common';
import { OrderManagerService } from './order-manager.service';

@Module({
  providers: [OrderManagerService],
  exports: [OrderManagerService],
})
export class ExecutionModule {}
