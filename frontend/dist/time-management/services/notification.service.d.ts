import { Model } from 'mongoose';
import { NotificationLog } from '../models/notification-log.schema';
import { AttendanceRecord } from '../models/attendance-record.schema';
import { TimeException } from '../models/time-exception.schema';
import { SendNotificationDto, GetNotificationLogsByEmployeeDto, SyncAttendanceWithPayrollDto, SyncLeaveWithPayrollDto, SynchronizeAttendanceAndPayrollDto } from '../dtos/notification-and-sync.dtos';
export declare class NotificationService {
    private notificationLogModel;
    private attendanceRecordModel;
    private timeExceptionModel;
    private readonly auditLogs;
    constructor(notificationLogModel: Model<NotificationLog>, attendanceRecordModel: Model<AttendanceRecord>, timeExceptionModel: Model<TimeException>);
    sendNotification(sendNotificationDto: SendNotificationDto, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, NotificationLog, {}, {}> & NotificationLog & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getNotificationLogsByEmployee(getNotificationLogsByEmployeeDto: GetNotificationLogsByEmployeeDto, currentUserId: string): Promise<(import("mongoose").Document<unknown, {}, NotificationLog, {}, {}> & NotificationLog & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    syncAttendanceWithPayroll(syncAttendanceWithPayrollDto: SyncAttendanceWithPayrollDto, currentUserId: string): Promise<{
        employeeId: string;
        startDate: Date;
        endDate: Date;
        records: {
            attendanceRecordId: any;
            employeeId: any;
            date: any;
            punches: any;
            totalWorkMinutes: any;
            totalWorkHours: number;
            hasMissedPunch: any;
            finalisedForPayroll: any;
        }[];
        summary: {
            totalRecords: number;
            totalWorkMinutes: number;
            totalWorkHours: number;
        };
    }>;
    syncLeaveWithPayroll(syncLeaveWithPayrollDto: SyncLeaveWithPayrollDto, currentUserId: string): Promise<{
        employeeId: string;
        startDate: Date;
        endDate: Date;
        message: string;
        attendanceContext: {
            note: string;
        };
    }>;
    synchronizeAttendanceAndPayroll(synchronizeAttendanceAndPayrollDto: SynchronizeAttendanceAndPayrollDto, currentUserId: string): Promise<{
        employeeId: string;
        startDate: Date;
        endDate: Date;
        attendance: {
            records: {
                attendanceRecordId: any;
                employeeId: any;
                date: any;
                punches: any;
                totalWorkMinutes: any;
                totalWorkHours: number;
                hasMissedPunch: any;
                finalisedForPayroll: any;
            }[];
            summary: {
                totalRecords: number;
                totalWorkMinutes: number;
                totalWorkHours: number;
            };
        };
        leave: {
            message: string;
            note: string;
        };
    }>;
    getAttendanceDataForSync(employeeId: string, startDate?: Date, endDate?: Date, currentUserId?: string): Promise<{
        employeeId: string;
        startDate: Date;
        endDate: Date;
        records: {
            attendanceRecordId: any;
            employeeId: any;
            date: any;
            punches: any;
            totalWorkMinutes: any;
            totalWorkHours: number;
            hasMissedPunch: any;
            finalisedForPayroll: any;
        }[];
        summary: {
            totalRecords: number;
            totalWorkMinutes: number;
            totalWorkHours: number;
        };
    }>;
    getOvertimeDataForSync(employeeId: string, startDate?: Date, endDate?: Date, currentUserId?: string): Promise<{
        employeeId: string;
        startDate: Date;
        endDate: Date;
        records: {
            exceptionId: any;
            employeeId: any;
            attendanceRecordId: any;
            date: any;
            overtimeMinutes: number;
            overtimeHours: number;
            status: any;
            reason: any;
        }[];
        summary: {
            totalRecords: number;
            totalOvertimeMinutes: number;
            totalOvertimeHours: number;
        };
    }>;
    private convertDateToUTCStart;
    private convertDateToUTCEnd;
    private logTimeManagementChange;
}
