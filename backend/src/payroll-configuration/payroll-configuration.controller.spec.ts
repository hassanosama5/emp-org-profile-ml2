import { Test, TestingModule } from '@nestjs/testing';
import { PayrollConfigurationController } from './payroll-configuration.controller';
import { PayrollConfigurationService } from './payroll-configuration.service';
import { ConfigStatus } from './enums/payroll-configuration-enums';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

describe('PayrollConfigurationController', () => {
  let controller: PayrollConfigurationController;
  let service: PayrollConfigurationService;
  const mockConnection = {
    db: {
      listCollections: () => ({ toArray: async () => [] }),
      databaseName: 'test',
    },
  } as any;

  const mockPayrollConfigurationService = {
    findAllPayGrades: jest.fn(),
    findOnePayGrade: jest.fn(),
    createPayGrade: jest.fn(),
    updatePayGrade: jest.fn(),
    deletePayGrade: jest.fn(),
    approvePayGrade: jest.fn(),
    rejectPayGrade: jest.fn(),
    findAllAllowances: jest.fn(),
    findOneAllowance: jest.fn(),
    createAllowance: jest.fn(),
    updateAllowance: jest.fn(),
    deleteAllowance: jest.fn(),
    approveAllowance: jest.fn(),
    rejectAllowance: jest.fn(),
    findAllPayTypes: jest.fn(),
    findOnePayType: jest.fn(),
    createPayType: jest.fn(),
    updatePayType: jest.fn(),
    deletePayType: jest.fn(),
    approvePayType: jest.fn(),
    rejectPayType: jest.fn(),
    getConfigurationStats: jest.fn(),
    getPendingApprovals: jest.fn(),
    getCompanySettings: jest.fn(),
    createCompanySettings: jest.fn(),
    updateCompanySettings: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollConfigurationController],
      providers: [
        {
          provide: PayrollConfigurationService,
          useValue: mockPayrollConfigurationService,
        },
        { provide: getConnectionToken(), useValue: mockConnection },
      ],
    }).compile();

    controller = module.get<PayrollConfigurationController>(
      PayrollConfigurationController,
    );
    service = module.get<PayrollConfigurationService>(
      PayrollConfigurationService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPayGrades', () => {
    it('should return pay grades with pagination', async () => {
      const result = {
        data: [{ id: '1', grade: 'A', baseSalary: 6000, grossSalary: 8000 }],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      mockPayrollConfigurationService.findAllPayGrades.mockResolvedValue(
        result,
      );

      expect(await controller.getPayGrades({})).toBe(result);
      expect(service.findAllPayGrades).toHaveBeenCalled();
    });
  });

  describe('createPayGrade', () => {
    it('should create a pay grade', async () => {
      const createDto = { grade: 'B', baseSalary: 7000, grossSalary: 9000 };
      const user = { userId: '665f1c2b5b88c3d9b3c3b1ab' };
      const result = { id: '1', ...createDto, status: ConfigStatus.DRAFT };
      mockPayrollConfigurationService.createPayGrade.mockResolvedValue(result);

      expect(await controller.createPayGrade(createDto, user)).toBe(result);
      expect(service.createPayGrade).toHaveBeenCalledWith(
        createDto,
        user.userId,
      );
    });
  });

  describe('getConfigurationStats', () => {
    it('should return configuration statistics', async () => {
      const result = {
        payGrades: { total: 5, draft: 2, approved: 3, rejected: 0 },
        allowances: { total: 3, draft: 1, approved: 2, rejected: 0 },
      };
      mockPayrollConfigurationService.getConfigurationStats.mockResolvedValue(
        result,
      );

      expect(await controller.getConfigurationStats()).toBe(result);
    });
  });

  describe('getPendingApprovals', () => {
    it('should return pending approvals', async () => {
      const result = {
        payGrades: [],
        allowances: [],
        totalPending: 0,
      };
      mockPayrollConfigurationService.getPendingApprovals.mockResolvedValue(
        result,
      );

      expect(await controller.getPendingApprovals()).toBe(result);
    });
  });

  describe('getAllowances', () => {
    it('should return allowances with pagination', async () => {
      const result = {
        data: [{ id: 'a1', name: 'Housing', amount: 1000 }],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      mockPayrollConfigurationService.findAllAllowances.mockResolvedValue(
        result,
      );

      expect(await controller.getAllowances({} as any)).toBe(result);
      expect(service.findAllAllowances).toHaveBeenCalled();
    });
  });

  describe('createAllowance', () => {
    it('should create an allowance', async () => {
      const createDto = { name: 'Transport', amount: 500 };
      const user = { userId: '665f1c2b5b88c3d9b3c3b1ab' };
      const result = { id: 'a2', ...createDto };
      mockPayrollConfigurationService.createAllowance.mockResolvedValue(result);

      expect(await controller.createAllowance(createDto as any, user)).toBe(
        result,
      );
      expect(service.createAllowance).toHaveBeenCalledWith(
        createDto,
        user.userId,
      );
    });
  });

  describe('approveAllowance', () => {
    it('should approve an allowance', async () => {
      const id = '665f1c2b5b88c3d9b3c3b1aa';
      const approvalDto = {};
      const user = { userId: '665f1c2b5b88c3d9b3c3b1ab' };
      const result = {
        id,
        status: 'approved',
        approvedBy: user.userId,
      };
      mockPayrollConfigurationService.approveAllowance.mockResolvedValue(
        result,
      );

      expect(
        await controller.approveAllowance(id, approvalDto as any, user),
      ).toBe(result);
      expect(service.approveAllowance).toHaveBeenCalledWith(
        id,
        approvalDto,
        user.userId,
      );
    });
  });
});
