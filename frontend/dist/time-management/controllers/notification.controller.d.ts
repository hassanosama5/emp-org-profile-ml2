import { NotificationService } from '../services/notification.service';
import { SendNotificationDto, SyncAttendanceWithPayrollDto, SyncLeaveWithPayrollDto, SynchronizeAttendanceAndPayrollDto } from '../dtos/notification-and-sync.dtos';
export declare class NotificationAndSyncController {
    private readonly notificationService;
    constructor(notificationService: NotificationService);
    sendNotification(sendNotificationDto: SendNotificationDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/notification-log.schema").NotificationLog, {}, {}> & import("../models/notification-log.schema").NotificationLog & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getNotificationLogsByEmployee(employeeId: string, user: any): Promise<(import("mongoose").Document<unknown, {}, import("../models/notification-log.schema").NotificationLog, {}, {}> & import("../models/notification-log.schema").NotificationLog & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    syncAttendanceWithPayroll(syncAttendanceWithPayrollDto: SyncAttendanceWithPayrollDto, user: any): Promise<{
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
    syncLeaveWithPayroll(syncLeaveWithPayrollDto: SyncLeaveWithPayrollDto, user: any): Promise<{
        employeeId: string;
        startDate: Date;
        endDate: Date;
        message: string;
        attendanceContext: {
            note: string;
        };
    }>;
    synchronizeAttendanceAndPayroll(synchronizeAttendanceAndPayrollDto: SynchronizeAttendanceAndPayrollDto, user: any): Promise<{
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
    getAttendanceDataForSync(employeeId: string, startDate?: string, endDate?: string, user?: any): Promise<{
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
    getOvertimeDataForSync(employeeId: string, startDate?: string, endDate?: string, user?: any): Promise<{
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
}
