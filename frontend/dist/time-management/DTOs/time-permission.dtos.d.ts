declare class PunchMetadataDto {
    type: string;
    time: Date;
}
export declare class CreateTimePermissionRequestDto {
    employeeId: string;
    permissionType: string;
    reason?: string;
    requestedStart?: Date;
    requestedEnd?: Date;
}
export declare class ProcessTimePermissionDto {
    requestId: string;
    actorId: string;
    comment?: string;
}
export declare class ApplyPermissionToPayrollDto {
    requestId: string;
    payrollPeriodId: string;
}
export declare class RecordPunchWithMetadataDto {
    employeeId: string;
    punches: PunchMetadataDto[];
    deviceId?: string;
    location?: string;
    source?: string;
}
export declare class ApplyAttendanceRoundingDto {
    attendanceRecordId: string;
    intervalMinutes: number;
    strategy: 'NEAREST' | 'CEILING' | 'FLOOR';
}
export declare class EnforcePunchPolicyDto {
    punches: PunchMetadataDto[];
    policy: 'FIRST_LAST' | 'MULTIPLE';
}
export declare class EnforceShiftPunchPolicyDto {
    punches: PunchMetadataDto[];
    shiftStart: string;
    shiftEnd: string;
    allowEarlyMinutes: number;
    allowLateMinutes: number;
}
export declare class MonitorRepeatedLatenessDto {
    employeeId: string;
    threshold: number;
    lookbackDays?: number;
}
export declare class TriggerLatenessDisciplinaryDto {
    employeeId: string;
    action?: string;
}
export {};
