"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const notification_log_schema_1 = require("../models/notification-log.schema");
const attendance_record_schema_1 = require("../models/attendance-record.schema");
const time_exception_schema_1 = require("../models/time-exception.schema");
const enums_1 = require("../models/enums");
let NotificationService = class NotificationService {
    constructor(notificationLogModel, attendanceRecordModel, timeExceptionModel) {
        this.notificationLogModel = notificationLogModel;
        this.attendanceRecordModel = attendanceRecordModel;
        this.timeExceptionModel = timeExceptionModel;
        this.auditLogs = [];
    }
    async sendNotification(sendNotificationDto, currentUserId) {
        const notification = new this.notificationLogModel({
            to: sendNotificationDto.to,
            type: sendNotificationDto.type,
            message: sendNotificationDto.message ?? '',
            createdBy: currentUserId,
            updatedBy: currentUserId,
        });
        await notification.save();
        await this.logTimeManagementChange('NOTIFICATION_SENT', {
            to: sendNotificationDto.to,
            type: sendNotificationDto.type,
        }, currentUserId);
        return notification;
    }
    async getNotificationLogsByEmployee(getNotificationLogsByEmployeeDto, currentUserId) {
        return this.notificationLogModel
            .find({ to: getNotificationLogsByEmployeeDto.employeeId })
            .exec();
    }
    async syncAttendanceWithPayroll(syncAttendanceWithPayrollDto, currentUserId) {
        const { employeeId, startDate, endDate } = syncAttendanceWithPayrollDto;
        const query = { employeeId };
        if (startDate && endDate) {
            const startDateUTC = this.convertDateToUTCStart(startDate);
            const endDateUTC = this.convertDateToUTCEnd(endDate);
            query.createdAt = { $gte: startDateUTC, $lte: endDateUTC };
        }
        const attendance = await this.attendanceRecordModel
            .find(query)
            .populate('employeeId', 'name email employeeId')
            .exec();
        await this.logTimeManagementChange('PAYROLL_SYNC_ATTENDANCE', {
            employeeId,
            records: attendance.length,
            startDate,
            endDate,
        }, currentUserId);
        return {
            employeeId,
            startDate,
            endDate,
            records: attendance.map((record) => ({
                attendanceRecordId: record._id,
                employeeId: record.employeeId?._id || record.employeeId,
                date: record.createdAt || record.date,
                punches: record.punches,
                totalWorkMinutes: record.totalWorkMinutes,
                totalWorkHours: Math.round((record.totalWorkMinutes / 60) * 100) / 100,
                hasMissedPunch: record.hasMissedPunch,
                finalisedForPayroll: record.finalisedForPayroll,
            })),
            summary: {
                totalRecords: attendance.length,
                totalWorkMinutes: attendance.reduce((sum, r) => sum + (r.totalWorkMinutes || 0), 0),
                totalWorkHours: Math.round((attendance.reduce((sum, r) => sum + (r.totalWorkMinutes || 0), 0) /
                    60) *
                    100) / 100,
            },
        };
    }
    async syncLeaveWithPayroll(syncLeaveWithPayrollDto, currentUserId) {
        const { employeeId, startDate, endDate } = syncLeaveWithPayrollDto;
        await this.logTimeManagementChange('PAYROLL_SYNC_LEAVE', {
            employeeId,
            startDate,
            endDate,
        }, currentUserId);
        return {
            employeeId,
            startDate,
            endDate,
            message: 'Leave data should be retrieved from Leaves subsystem. This endpoint provides attendance context only.',
            attendanceContext: {
                note: 'Use attendance records to validate leave periods',
            },
        };
    }
    async synchronizeAttendanceAndPayroll(synchronizeAttendanceAndPayrollDto, currentUserId) {
        const { employeeId, startDate, endDate } = synchronizeAttendanceAndPayrollDto;
        const query = { employeeId };
        if (startDate && endDate) {
            const startDateUTC = this.convertDateToUTCStart(startDate);
            const endDateUTC = this.convertDateToUTCEnd(endDate);
            query.createdAt = { $gte: startDateUTC, $lte: endDateUTC };
        }
        const attendance = await this.attendanceRecordModel
            .find(query)
            .populate('employeeId', 'name email employeeId')
            .exec();
        await this.logTimeManagementChange('PAYROLL_SYNC_FULL', {
            employeeId,
            attendanceCount: attendance.length,
            startDate,
            endDate,
        }, currentUserId);
        return {
            employeeId,
            startDate,
            endDate,
            attendance: {
                records: attendance.map((record) => ({
                    attendanceRecordId: record._id,
                    employeeId: record.employeeId?._id || record.employeeId,
                    date: record.createdAt || record.date,
                    punches: record.punches,
                    totalWorkMinutes: record.totalWorkMinutes,
                    totalWorkHours: Math.round((record.totalWorkMinutes / 60) * 100) / 100,
                    hasMissedPunch: record.hasMissedPunch,
                    finalisedForPayroll: record.finalisedForPayroll,
                })),
                summary: {
                    totalRecords: attendance.length,
                    totalWorkMinutes: attendance.reduce((sum, r) => sum + (r.totalWorkMinutes || 0), 0),
                    totalWorkHours: Math.round((attendance.reduce((sum, r) => sum + (r.totalWorkMinutes || 0), 0) /
                        60) *
                        100) / 100,
                },
            },
            leave: {
                message: 'Leave data should be retrieved from Leaves subsystem',
                note: 'Use Leaves API to get leave records for this employee',
            },
        };
    }
    async getAttendanceDataForSync(employeeId, startDate, endDate, currentUserId) {
        const query = { employeeId };
        if (startDate && endDate) {
            const startDateUTC = this.convertDateToUTCStart(startDate);
            const endDateUTC = this.convertDateToUTCEnd(endDate);
            query.createdAt = { $gte: startDateUTC, $lte: endDateUTC };
        }
        const attendance = await this.attendanceRecordModel
            .find(query)
            .populate('employeeId', 'name email employeeId')
            .exec();
        return {
            employeeId,
            startDate,
            endDate,
            records: attendance.map((record) => ({
                attendanceRecordId: record._id,
                employeeId: record.employeeId?._id || record.employeeId,
                date: record.createdAt || record.date,
                punches: record.punches,
                totalWorkMinutes: record.totalWorkMinutes,
                totalWorkHours: Math.round((record.totalWorkMinutes / 60) * 100) / 100,
                hasMissedPunch: record.hasMissedPunch,
                finalisedForPayroll: record.finalisedForPayroll,
            })),
            summary: {
                totalRecords: attendance.length,
                totalWorkMinutes: attendance.reduce((sum, r) => sum + (r.totalWorkMinutes || 0), 0),
                totalWorkHours: Math.round((attendance.reduce((sum, r) => sum + (r.totalWorkMinutes || 0), 0) /
                    60) *
                    100) / 100,
            },
        };
    }
    async getOvertimeDataForSync(employeeId, startDate, endDate, currentUserId) {
        const query = {
            employeeId,
            type: enums_1.TimeExceptionType.OVERTIME_REQUEST,
        };
        if (startDate && endDate) {
            const startDateUTC = this.convertDateToUTCStart(startDate);
            const endDateUTC = this.convertDateToUTCEnd(endDate);
            query.createdAt = { $gte: startDateUTC, $lte: endDateUTC };
        }
        const overtimeExceptions = await this.timeExceptionModel
            .find(query)
            .populate('employeeId', 'name email employeeId')
            .populate('attendanceRecordId')
            .exec();
        const overtimeData = overtimeExceptions.map((exception) => {
            const record = exception.attendanceRecordId;
            const standardMinutes = 480;
            const overtimeMinutes = record && record.totalWorkMinutes
                ? Math.max(0, record.totalWorkMinutes - standardMinutes)
                : 0;
            return {
                exceptionId: exception._id,
                employeeId: exception.employeeId?._id || exception.employeeId,
                attendanceRecordId: exception.attendanceRecordId?._id || exception.attendanceRecordId,
                date: exception.createdAt || record?.createdAt,
                overtimeMinutes,
                overtimeHours: Math.round((overtimeMinutes / 60) * 100) / 100,
                status: exception.status,
                reason: exception.reason,
            };
        });
        return {
            employeeId,
            startDate,
            endDate,
            records: overtimeData,
            summary: {
                totalRecords: overtimeData.length,
                totalOvertimeMinutes: overtimeData.reduce((sum, r) => sum + r.overtimeMinutes, 0),
                totalOvertimeHours: Math.round((overtimeData.reduce((sum, r) => sum + r.overtimeMinutes, 0) / 60) *
                    100) / 100,
            },
        };
    }
    convertDateToUTCStart(date) {
        const dateObj = date instanceof Date ? date : new Date(date);
        return new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 0, 0, 0, 0));
    }
    convertDateToUTCEnd(date) {
        const dateObj = date instanceof Date ? date : new Date(date);
        return new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 23, 59, 59, 999));
    }
    async logTimeManagementChange(entity, changeSet, actorId) {
        this.auditLogs.push({
            entity,
            changeSet,
            actorId,
            timestamp: new Date(),
        });
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(notification_log_schema_1.NotificationLog.name)),
    __param(1, (0, mongoose_1.InjectModel)(attendance_record_schema_1.AttendanceRecord.name)),
    __param(2, (0, mongoose_1.InjectModel)(time_exception_schema_1.TimeException.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], NotificationService);
//# sourceMappingURL=notification.service.js.map