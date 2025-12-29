export declare class SendNotificationDto {
    to: string;
    type: string;
    message: string;
}
export declare class GetNotificationLogsByEmployeeDto {
    employeeId: string;
}
export declare class SyncAttendanceWithPayrollDto {
    employeeId: string;
    startDate?: Date;
    endDate?: Date;
}
export declare class SyncLeaveWithPayrollDto {
    employeeId: string;
    startDate?: Date;
    endDate?: Date;
}
export declare class SynchronizeAttendanceAndPayrollDto {
    employeeId: string;
    startDate?: Date;
    endDate?: Date;
}
export declare class BlockPayrollForMissedPunchDto {
    employeeId: string;
    reason?: string;
}
export declare class SyncTimeDataWithPayrollDto {
    payrollRunId?: string;
    effectiveDate?: Date;
    includeAdjustments?: boolean;
}
export declare class SyncWithBenefitsDto {
    employeeId?: string;
    benefitType?: string;
    effectiveDate?: Date;
}
export declare class SyncWithLeaveDto {
    employeeId?: string;
    leaveType?: string;
    windowStart?: Date;
    windowEnd?: Date;
}
export declare class CreateNotificationTemplateDto {
    templateKey: string;
    subject: string;
    body: string;
    channel?: 'email' | 'sms' | 'in-app';
}
export declare class UpdateNotificationTemplateDto {
    templateKey: string;
    subject?: string;
    body?: string;
    channel?: 'email' | 'sms' | 'in-app';
}
