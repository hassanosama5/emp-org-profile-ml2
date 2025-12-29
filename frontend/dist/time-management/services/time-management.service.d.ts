import { Model } from 'mongoose';
import { AttendanceRecord } from '../models/attendance-record.schema';
import { AttendanceCorrectionRequest } from '../models/attendance-correction-request.schema';
import { TimeException } from '../models/time-exception.schema';
import { ShiftAssignment } from '../models/shift-assignment.schema';
import { ApplyAttendanceRoundingDto, EnforcePunchPolicyDto, EnforceShiftPunchPolicyDto, MonitorRepeatedLatenessDto, RecordPunchWithMetadataDto, TriggerLatenessDisciplinaryDto } from '../DTOs/time-permission.dtos';
import { GenerateOvertimeReportDto, GenerateLatenessReportDto, GenerateExceptionReportDto, ExportReportDto } from '../DTOs/reporting.dtos';
export declare class TimeManagementService {
    private attendanceRecordModel;
    private correctionRequestModel;
    private timeExceptionModel;
    private shiftAssignmentModel;
    private readonly auditLogs;
    constructor(attendanceRecordModel: Model<AttendanceRecord>, correctionRequestModel: Model<AttendanceCorrectionRequest>, timeExceptionModel: Model<TimeException>, shiftAssignmentModel: Model<ShiftAssignment>);
    clockInWithID(employeeId: string, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, AttendanceRecord, {}, {}> & AttendanceRecord & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    clockOutWithID(employeeId: string, currentUserId: string): Promise<any>;
    createAttendanceRecord(createAttendanceRecordDto: any, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, AttendanceRecord, {}, {}> & AttendanceRecord & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateAttendanceRecord(id: string, updateAttendanceRecordDto: any, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, AttendanceRecord, {}, {}> & AttendanceRecord & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    submitAttendanceCorrectionRequest(submitCorrectionRequestDto: any, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, AttendanceCorrectionRequest, {}, {}> & AttendanceCorrectionRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getAllCorrectionRequests(getAllCorrectionsDto: any, currentUserId: string): Promise<(import("mongoose").Document<unknown, {}, AttendanceCorrectionRequest, {}, {}> & AttendanceCorrectionRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    approveCorrectionRequest(approveCorrectionRequestDto: any, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, AttendanceCorrectionRequest, {}, {}> & AttendanceCorrectionRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    rejectCorrectionRequest(rejectCorrectionRequestDto: any, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, AttendanceCorrectionRequest, {}, {}> & AttendanceCorrectionRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    createTimeException(createTimeExceptionDto: any, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, TimeException, {}, {}> & TimeException & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateTimeException(id: string, updateTimeExceptionDto: any, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, TimeException, {}, {}> & TimeException & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getTimeExceptionsByEmployee(employeeId: string, getTimeExceptionsDto: any, currentUserId: string): Promise<(import("mongoose").Document<unknown, {}, TimeException, {}, {}> & TimeException & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    approveTimeException(approveTimeExceptionDto: any, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, TimeException, {}, {}> & TimeException & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    rejectTimeException(rejectTimeExceptionDto: any, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, TimeException, {}, {}> & TimeException & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    escalateTimeException(escalateTimeExceptionDto: any, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, TimeException, {}, {}> & TimeException & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    recordPunchWithMetadata(recordPunchWithMetadataDto: RecordPunchWithMetadataDto, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, AttendanceRecord, {}, {}> & AttendanceRecord & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    recordPunchFromDevice(recordPunchWithMetadataDto: RecordPunchWithMetadataDto, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, AttendanceRecord, {}, {}> & AttendanceRecord & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    enforcePunchPolicy(enforcePunchPolicyDto: EnforcePunchPolicyDto, currentUserId: string): Promise<{
        valid: boolean;
        policy: "MULTIPLE" | "FIRST_LAST";
    }>;
    applyAttendanceRounding(applyAttendanceRoundingDto: ApplyAttendanceRoundingDto, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, AttendanceRecord, {}, {}> & AttendanceRecord & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    enforceShiftPunchPolicy(enforceShiftPunchPolicyDto: EnforceShiftPunchPolicyDto, currentUserId: string): Promise<{
        valid: boolean;
    }>;
    monitorRepeatedLateness(monitorRepeatedLatenessDto: MonitorRepeatedLatenessDto, currentUserId: string): Promise<{
        employeeId: string;
        count: number;
        threshold: number;
        exceeded: boolean;
    }>;
    triggerLatenessDisciplinary(triggerLatenessDisciplinaryDto: TriggerLatenessDisciplinaryDto, currentUserId: string): Promise<{
        message: string;
    }>;
    scheduleTimeDataBackup(currentUserId: string): Promise<{
        message: string;
    }>;
    checkExpiringShiftAssignments(daysBeforeExpiry: number, currentUserId: string): Promise<{
        count: number;
        assignments: {
            employeeId: string;
            shiftId: import("mongoose").Types.ObjectId;
            endDate: Date;
        }[];
    }>;
    detectMissedPunches(currentUserId: string): Promise<{
        count: number;
        records: any[];
    }>;
    escalateUnresolvedRequestsBeforePayroll(payrollCutOffDate: Date, currentUserId: string): Promise<{
        count: number;
        escalated: {
            type: string;
            id: any;
        }[];
    }>;
    generateOvertimeReport(generateOvertimeReportDto: GenerateOvertimeReportDto, currentUserId: string): Promise<{
        employeeId: string;
        startDate: Date;
        endDate: Date;
        records: (import("mongoose").Document<unknown, {}, TimeException, {}, {}> & TimeException & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        })[];
        summary: {
            totalRecords: number;
            totalOvertimeMinutes: number;
            totalOvertimeHours: number;
        };
    }>;
    generateLatenessReport(generateLatenessReportDto: GenerateLatenessReportDto, currentUserId: string): Promise<{
        employeeId: string;
        startDate: Date;
        endDate: Date;
        records: (import("mongoose").Document<unknown, {}, TimeException, {}, {}> & TimeException & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        })[];
        summary: {
            totalRecords: number;
            employees: number;
        };
    }>;
    generateExceptionReport(generateExceptionReportDto: GenerateExceptionReportDto, currentUserId: string): Promise<{
        employeeId: string;
        startDate: Date;
        endDate: Date;
        records: (import("mongoose").Document<unknown, {}, TimeException, {}, {}> & TimeException & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        })[];
        summary: {
            totalRecords: number;
            byType: {
                type: string;
                count: number;
            }[];
        };
    }>;
    exportReport(exportReportDto: ExportReportDto, currentUserId: string): Promise<{
        format: "text" | "excel" | "csv";
        data: string;
        reportType: "overtime" | "lateness" | "exception";
        generatedAt: Date;
    }>;
    private logTimeManagementChange;
    private logAttendanceChange;
    private calculateWorkMinutesFromPunches;
    private roundMinutes;
    private timeStringToMinutes;
    private dateToMinutes;
    private dateToMinutesUTC;
    private convertDateToUTCStart;
    private convertDateToUTCEnd;
    private formatAsCSV;
    private formatAsText;
}
