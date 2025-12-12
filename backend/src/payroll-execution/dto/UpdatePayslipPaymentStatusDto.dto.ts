import { IsEnum, IsMongoId } from 'class-validator';
import { PaySlipPaymentStatus } from '../enums/payroll-execution-enum';

export class UpdatePayslipPaymentStatusDto {
  @IsMongoId()
  payslipId: string;

  @IsEnum(PaySlipPaymentStatus)
  paymentStatus: PaySlipPaymentStatus; // PENDING | PAID
}
