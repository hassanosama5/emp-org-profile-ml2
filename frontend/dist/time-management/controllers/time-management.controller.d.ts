import { TimeManagementService } from '../services/time-management.service';
import { CreateAttendanceRecordDto, UpdateAttendanceRecordDto, SubmitCorrectionRequestDto, GetAllCorrectionsDto, CreateTimeExceptionDto, UpdateTimeExceptionDto, GetTimeExceptionsByEmployeeDto, ApproveTimeExceptionDto, RejectTimeExceptionDto, EscalateTimeExceptionDto, ApproveCorrectionRequestDto, RejectCorrectionRequestDto } from '../DTOs/attendance.dtos';
import { ApplyAttendanceRoundingDto, EnforcePunchPolicyDto, EnforceShiftPunchPolicyDto, MonitorRepeatedLatenessDto, RecordPunchWithMetadataDto, TriggerLatenessDisciplinaryDto } from '../DTOs/time-permission.dtos';
import { GenerateOvertimeReportDto, GenerateLatenessReportDto, GenerateExceptionReportDto, ExportReportDto } from '../DTOs/reporting.dtos';
export declare class TimeManagementController {
    private readonly timeManagementService;
    constructor(timeManagementService: TimeManagementService);
    clockInWithID(employeeId: string, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/attendance-record.schema").AttendanceRecord, {}, {}> & import("../models/attendance-record.schema").AttendanceRecord & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    clockOutWithID(employeeId: string, user: any): Promise<any>;
    createAttendanceRecord(createAttendanceRecordDto: CreateAttendanceRecordDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/attendance-record.schema").AttendanceRecord, {}, {}> & import("../models/attendance-record.schema").AttendanceRecord & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateAttendanceRecord(id: string, updateAttendanceRecordDto: UpdateAttendanceRecordDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/attendance-record.schema").AttendanceRecord, {}, {}> & import("../models/attendance-record.schema").AttendanceRecord & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    submitAttendanceCorrectionRequest(submitCorrectionRequestDto: SubmitCorrectionRequestDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/attendance-correction-request.schema").AttendanceCorrectionRequest, {}, {}> & import("../models/attendance-correction-request.schema").AttendanceCorrectionRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getAllCorrectionRequests(getAllCorrectionsDto: GetAllCorrectionsDto, user: any): Promise<(import("mongoose").Document<unknown, {}, import("../models/attendance-correction-request.schema").AttendanceCorrectionRequest, {}, {}> & import("../models/attendance-correction-request.schema").AttendanceCorrectionRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    approveCorrectionRequest(approveCorrectionRequestDto: ApproveCorrectionRequestDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/attendance-correction-request.schema").AttendanceCorrectionRequest, {}, {}> & import("../models/attendance-correction-request.schema").AttendanceCorrectionRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    rejectCorrectionRequest(rejectCorrectionRequestDto: RejectCorrectionRequestDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/attendance-correction-request.schema").AttendanceCorrectionRequest, {}, {}> & import("../models/attendance-correction-request.schema").AttendanceCorrectionRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    recordPunchWithMetadata(recordPunchWithMetadataDto: RecordPunchWithMetadataDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/attendance-record.schema").AttendanceRecord, {}, {}> & import("../models/attendance-record.schema").AttendanceRecord & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    recordPunchFromDevice(recordPunchWithMetadataDto: RecordPunchWithMetadataDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/attendance-record.schema").AttendanceRecord, {}, {}> & import("../models/attendance-record.schema").AttendanceRecord & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    enforcePunchPolicy(enforcePunchPolicyDto: EnforcePunchPolicyDto, user: any): Promise<{
        valid: boolean;
        policy: "MULTIPLE" | "FIRST_LAST";
    }>;
    applyAttendanceRounding(applyAttendanceRoundingDto: ApplyAttendanceRoundingDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/attendance-record.schema").AttendanceRecord, {}, {}> & import("../models/attendance-record.schema").AttendanceRecord & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    enforceShiftPunchPolicy(enforceShiftPunchPolicyDto: EnforceShiftPunchPolicyDto, user: any): Promise<{
        valid: boolean;
    }>;
    createTimeException(createTimeExceptionDto: CreateTimeExceptionDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/time-exception.schema").TimeException, {}, {}> & import("../models/time-exception.schema").TimeException & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateTimeException(id: string, updateTimeExceptionDto: UpdateTimeExceptionDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/time-exception.schema").TimeException, {}, {}> & import("../models/time-exception.schema").TimeException & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getTimeExceptionsByEmployee(id: string, getTimeExceptionsByEmployeeDto: GetTimeExceptionsByEmployeeDto, user: any): Promise<(import("mongoose").Document<unknown, {}, import("../models/time-exception.schema").TimeException, {}, {}> & import("../models/time-exception.schema").TimeException & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    approveTimeException(approveTimeExceptionDto: ApproveTimeExceptionDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/time-exception.schema").TimeException, {}, {}> & import("../models/time-exception.schema").TimeException & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    rejectTimeException(rejectTimeExceptionDto: RejectTimeExceptionDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/time-exception.schema").TimeException, {}, {}> & import("../models/time-exception.schema").TimeException & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    escalateTimeException(escalateTimeExceptionDto: EscalateTimeExceptionDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/time-exception.schema").TimeException, {}, {}> & import("../models/time-exception.schema").TimeException & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    checkExpiringShiftAssignments(body: {
        daysBeforeExpiry?: number;
    }, user: any): Promise<{
        count: number;
        assignments: {
            employeeId: string;
            shiftId: import("mongoose").Types.ObjectId;
            endDate: Date;
        }[];
    }>;
    detectMissedPunches(user: any): Promise<{
        count: number;
        records: any[];
    }>;
    escalateUnresolvedRequestsBeforePayroll(body: {
        payrollCutOffDate: Date;
    }, user: any): Promise<{
        count: number;
        escalated: {
            type: string;
            id: any;
        }[];
    }>;
    monitorRepeatedLateness(monitorRepeatedLatenessDto: MonitorRepeatedLatenessDto, user: any): Promise<{
        employeeId: string;
        count: number;
        threshold: number;
        exceeded: boolean;
    }>;
    triggerLatenessDisciplinary(triggerLatenessDisciplinaryDto: TriggerLatenessDisciplinaryDto, user: any): Promise<{
        message: string;
    }>;
    scheduleTimeDataBackup(user: any): Promise<{
        message: string;
    }>;
    generateOvertimeReport(generateOvertimeReportDto: GenerateOvertimeReportDto, user: any): Promise<{
        employeeId: string;
        startDate: Date;
        endDate: Date;
        records: (import("mongoose").Document<unknown, {}, import("../models/time-exception.schema").TimeException, {}, {}> & import("../models/time-exception.schema").TimeException & {
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
    generateLatenessReport(generateLatenessReportDto: GenerateLatenessReportDto, user: any): Promise<{
        employeeId: string;
        startDate: Date;
        endDate: Date;
        records: (import("mongoose").Document<unknown, {}, import("../models/time-exception.schema").TimeException, {}, {}> & import("../models/time-exception.schema").TimeException & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        })[];
        summary: {
            totalRecords: number;
            employees: number;
        };
    }>;
    generateExceptionReport(generateExceptionReportDto: GenerateExceptionReportDto, user: any): Promise<{
        employeeId: string;
        startDate: Date;
        endDate: Date;
        records: (import("mongoose").Document<unknown, {}, import("../models/time-exception.schema").TimeException, {}, {}> & import("../models/time-exception.schema").TimeException & {
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
    exportReport(exportReportDto: ExportReportDto, user: any): Promise<{
        format: "text" | "excel" | "csv";
        data: string;
        reportType: "overtime" | "lateness" | "exception";
        generatedAt: Date;
    }>;
}
