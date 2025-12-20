import { HolidayType } from '../models/enums';
export declare class CreateOvertimeRuleDto {
    name: string;
    description: string;
    active: boolean;
    approved: boolean;
}
export declare class UpdateOvertimeRuleDto {
    name: string;
    description: string;
    active: boolean;
    approved: boolean;
}
export declare class CreateLatenessRuleDto {
    name: string;
    description: string;
    gracePeriodMinutes: number;
    deductionForEachMinute: number;
    active: boolean;
}
export declare class UpdateLatenessRuleDto {
    name: string;
    description: string;
    gracePeriodMinutes: number;
    deductionForEachMinute: number;
    active: boolean;
}
export declare class CreateHolidayDto {
    type: HolidayType;
    startDate: Date;
    endDate: Date;
    name: string;
    active: boolean;
}
export declare class UpdateHolidayDto {
    type: HolidayType;
    startDate: Date;
    endDate: Date;
    name: string;
    active: boolean;
}
export declare class GetHolidaysDto {
    startDate?: Date;
    endDate?: Date;
    type?: HolidayType;
    active?: boolean;
}
export declare class GetPoliciesDto {
    active?: boolean;
    approved?: boolean;
}
export declare class CheckHolidayDto {
    date: Date;
}
export declare class ValidateAttendanceHolidayDto {
    employeeId: string;
    date: Date;
    suppressPenalty?: boolean;
}
