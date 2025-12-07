import { Test, TestingModule } from '@nestjs/testing';
import { LeaveController } from './leaves.controller';

describe('LeavesController', () => {
  let controller: LeaveController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeaveController],
    }).compile();

    controller = module.get<LeaveController>(LeaveController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

  
