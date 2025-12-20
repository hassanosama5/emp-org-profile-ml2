import { PunchPolicy, ShiftAssignmentStatus } from '../models/enums';
export declare class CreateShiftTypeDto {
    name: string;
    active: boolean;
}
export declare class UpdateShiftTypeDto {
    name: string;
    active: boolean;
}
export declare class GetShiftTypesDto {
}
export declare class CreateShiftDto {
    name: string;
    shiftType: string;
    startTime: string;
    endTime: string;
    punchPolicy: PunchPolicy;
    graceInMinutes: number;
    graceOutMinutes: number;
    requiresApprovalForOvertime: boolean;
    active: boolean;
}
export declare class UpdateShiftDto {
    name: string;
    shiftType: string;
    punchPolicy: PunchPolicy;
    startTime: string;
    endTime: string;
    graceInMinutes: number;
    graceOutMinutes: number;
    requiresApprovalForOvertime: boolean;
    active: boolean;
}
export declare class GetShiftsByTypeDto {
    shiftType: string;
}
export declare class AssignShiftToEmployeeDto {
    employeeId: string;
    shiftId: string;
    startDate: Date;
    endDate: Date;
    status: ShiftAssignmentStatus;
    departmentId?: string;
    positionId?: string;
    scheduleRuleId?: string;
}
export declare class AssignShiftToDepartmentDto {
    departmentId: string;
    shiftId: string;
    includePositions?: string[];
    startDate?: Date;
    endDate?: Date;
}
export declare class AssignShiftToPositionDto {
    positionId: string;
    shiftId: string;
    startDate?: Date;
    endDate?: Date;
}
export declare class UpdateShiftAssignmentDto {
    status: ShiftAssignmentStatus;
    startDate: Date;
    endDate: Date;
    employeeId?: string;
    departmentId?: string;
    positionId?: string;
    shiftId?: string;
    scheduleRuleId?: string;
}
export declare class RenewShiftAssignmentDto {
    assignmentId: string;
    newEndDate?: Date;
    note?: string;
}
export declare class CancelShiftAssignmentDto {
    assignmentId: string;
    reason?: string;
}
export declare class PostponeShiftAssignmentDto {
    assignmentId: string;
    postponeUntil: Date;
}
export declare class GetEmployeeShiftAssignmentsDto {
    employeeId: string;
}
export declare class GetShiftAssignmentStatusDto {
    shiftAssignmentId: string;
}
export declare class CreateScheduleRuleDto {
    name: string;
    pattern: string;
    active: boolean;
}
export declare class GetScheduleRulesDto {
    active?: boolean;
}
export declare class AssignScheduleRuleToEmployeeDto {
    employeeId: string;
    scheduleRuleId: string;
    startDate?: Date;
    endDate?: Date;
}
export declare class DefineFlexibleSchedulingRulesDto {
    name: string;
    pattern: string;
    active: boolean;
}
export declare class CreateShiftTypeWithDatesDto {
    name: string;
    description?: string;
    effectiveStart: Date;
    effectiveEnd?: Date;
}
export declare class ValidateScheduleRuleDto {
    scheduleRuleId: string;
    assignmentDate?: Date;
}
export declare class ApplyFlexibleScheduleRulesDto {
    targetDate?: Date;
    scheduleRuleIds?: string[];
}
export declare class LinkShiftToVacationAndHolidaysDto {
    shiftId: string;
    holidayIds?: string[];
    vacationPackageId?: string;
}
export declare class ValidateHolidayBeforeShiftAssignmentDto {
    shiftId: string;
    employeeId: string;
    assignmentDate: Date;
}
export declare class LinkVacationPackageToScheduleDto {
    scheduleRuleId: string;
    vacationPackageId: string;
    effectiveStart?: Date;
    effectiveEnd?: Date;
}
