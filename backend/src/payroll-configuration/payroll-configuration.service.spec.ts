import { Test, TestingModule } from '@nestjs/testing';
import { PayrollConfigurationService } from './payroll-configuration.service';
import { getModelToken } from '@nestjs/mongoose';

describe('PayrollConfigurationService', () => {
  let service: PayrollConfigurationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollConfigurationService,
        { provide: getModelToken('payGrade'), useValue: {} },
        { provide: getModelToken('payrollPolicies'), useValue: {} },
        { provide: getModelToken('allowance'), useValue: {} },
        { provide: getModelToken('payType'), useValue: {} },
        { provide: getModelToken('taxRules'), useValue: {} },
        { provide: getModelToken('insuranceBrackets'), useValue: {} },
        { provide: getModelToken('signingBonus'), useValue: {} },
        {
          provide: getModelToken('terminationAndResignationBenefits'),
          useValue: {},
        },
        { provide: getModelToken('CompanyWideSettings'), useValue: {} },
      ],
    }).compile();

    service = module.get<PayrollConfigurationService>(
      PayrollConfigurationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
