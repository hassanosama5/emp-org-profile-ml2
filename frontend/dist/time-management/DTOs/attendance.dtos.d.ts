import { CorrectionRequestStatus, TimeExceptionType, TimeExceptionStatus, PunchType } from '../models/enums';
export declare class CreateAttendanceRecordDto {
    employeeId: string;
    punches: {
        type: PunchType;
        time: Date;
    }[];
    totalWorkMinutes: number;
    hasMissedPunch: boolean;
    exceptionIds: string[];
    finalisedForPayroll: boolean;
}
export declare class GetAttendanceRecordDto {
    employeeId: string;
    startDate?: Date;
    endDate?: Date;
}
export declare class UpdateAttendanceRecordDto {
    punches: {
        type: PunchType;
        time: Date;
    }[];
    totalWorkMinutes: number;
    hasMissedPunch: boolean;
    exceptionIds: string[];
    finalisedForPayroll: boolean;
}
export declare class ValidateAttendanceDto {
    employeeId: string;
    date?: Date;
    shiftId?: string;
}
export declare class CalculateWorkMinutesDto {
    employeeId: string;
    startDate?: Date;
    endDate?: Date;
}
export declare class SubmitCorrectionRequestDto {
    employeeId: string;
    attendanceRecord: string;
    reason: string;
    status: CorrectionRequestStatus;
}
export declare class GetCorrectionsDto {
    status?: CorrectionRequestStatus;
    employeeId?: string;
}
export declare class GetAllCorrectionsDto {
    status?: CorrectionRequestStatus;
    employeeId?: string;
}
export declare class CreateTimeExceptionDto {
    employeeId: string;
    type: TimeExceptionType;
    attendanceRecordId: string;
    assignedTo: string;
    status: TimeExceptionStatus;
    reason: string;
}
export declare class UpdateTimeExceptionDto {
    status: TimeExceptionStatus;
    assignedTo: string;
    reason: string;
}
export declare class GetTimeExceptionsByEmployeeDto {
    employeeId: string;
    status?: TimeExceptionStatus;
}
export declare class ApproveTimeExceptionDto {
    timeExceptionId: string;
}
export declare class RejectTimeExceptionDto {
    timeExceptionId: string;
}
export declare class EscalateTimeExceptionDto {
    timeExceptionId: string;
}
export declare class ApproveCorrectionRequestDto {
    correctionRequestId: string;
    reason?: string;
}
export declare class RejectCorrectionRequestDto {
    correctionRequestId: string;
    reason?: string;
}
