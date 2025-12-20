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
exports.TimeManagementService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const attendance_record_schema_1 = require("../models/attendance-record.schema");
const attendance_correction_request_schema_1 = require("../models/attendance-correction-request.schema");
const time_exception_schema_1 = require("../models/time-exception.schema");
const shift_assignment_schema_1 = require("../models/shift-assignment.schema");
const enums_1 = require("../models/enums");
let TimeManagementService = class TimeManagementService {
    constructor(attendanceRecordModel, correctionRequestModel, timeExceptionModel, shiftAssignmentModel) {
        this.attendanceRecordModel = attendanceRecordModel;
        this.correctionRequestModel = correctionRequestModel;
        this.timeExceptionModel = timeExceptionModel;
        this.shiftAssignmentModel = shiftAssignmentModel;
        this.auditLogs = [];
    }
    async clockInWithID(employeeId, currentUserId) {
        const now = new Date();
        const attendanceRecord = new this.attendanceRecordModel({
            employeeId,
            punches: [
                {
                    type: enums_1.PunchType.IN,
                    time: now,
                },
            ],
            totalWorkMinutes: 0,
            hasMissedPunch: false,
            finalisedForPayroll: false,
            createdBy: currentUserId,
            updatedBy: currentUserId,
        });
        return attendanceRecord.save();
    }
    async clockOutWithID(employeeId, currentUserId) {
        const now = new Date();
        const attendanceRecords = await this.attendanceRecordModel
            .find({
            employeeId,
        })
            .sort({ createdAt: -1 })
            .exec();
        if (!attendanceRecords || attendanceRecords.length === 0) {
            throw new Error('No attendance record found. Please clock in first.');
        }
        let attendanceRecord = null;
        for (const record of attendanceRecords) {
            if (record.punches && record.punches.length > 0) {
                const lastPunch = record.punches[record.punches.length - 1];
                if (lastPunch.type === enums_1.PunchType.IN) {
                    attendanceRecord = record;
                    break;
                }
            }
        }
        if (!attendanceRecord) {
            throw new Error('No active clock-in found. Please clock in first.');
        }
        attendanceRecord.punches.push({
            type: enums_1.PunchType.OUT,
            time: now,
        });
        let totalMinutes = 0;
        for (let i = 0; i < attendanceRecord.punches.length; i += 2) {
            if (i + 1 < attendanceRecord.punches.length) {
                const inTime = attendanceRecord.punches[i].time.getTime();
                const outTime = attendanceRecord.punches[i + 1].time.getTime();
                totalMinutes += (outTime - inTime) / 60000;
            }
        }
        attendanceRecord.totalWorkMinutes = totalMinutes;
        attendanceRecord.updatedBy = currentUserId;
        return attendanceRecord.save();
    }
    async createAttendanceRecord(createAttendanceRecordDto, currentUserId) {
        const newAttendanceRecord = new this.attendanceRecordModel({
            ...createAttendanceRecordDto,
            createdBy: currentUserId,
            updatedBy: currentUserId,
        });
        return newAttendanceRecord.save();
    }
    async updateAttendanceRecord(id, updateAttendanceRecordDto, currentUserId) {
        return this.attendanceRecordModel.findByIdAndUpdate(id, {
            ...updateAttendanceRecordDto,
            updatedBy: currentUserId,
        }, { new: true });
    }
    async submitAttendanceCorrectionRequest(submitCorrectionRequestDto, currentUserId) {
        const newCorrectionRequest = new this.correctionRequestModel({
            employeeId: submitCorrectionRequestDto.employeeId,
            attendanceRecord: submitCorrectionRequestDto.attendanceRecord,
            reason: submitCorrectionRequestDto.reason,
            status: submitCorrectionRequestDto.status || enums_1.CorrectionRequestStatus.SUBMITTED,
            createdBy: currentUserId,
            updatedBy: currentUserId,
        });
        return newCorrectionRequest.save();
    }
    async getAllCorrectionRequests(getAllCorrectionsDto, currentUserId) {
        const { status, employeeId } = getAllCorrectionsDto;
        const query = {};
        if (status) {
            query.status = status;
        }
        if (employeeId) {
            query.employeeId = employeeId;
        }
        return this.correctionRequestModel
            .find(query)
            .populate('attendanceRecord')
            .populate('employeeId')
            .exec();
    }
    async approveCorrectionRequest(approveCorrectionRequestDto, currentUserId) {
        const { correctionRequestId, reason } = approveCorrectionRequestDto;
        const correctionRequest = await this.correctionRequestModel
            .findByIdAndUpdate(correctionRequestId, {
            status: enums_1.CorrectionRequestStatus.APPROVED,
            ...(reason && { reason }),
            updatedBy: currentUserId,
        }, { new: true })
            .exec();
        if (!correctionRequest) {
            throw new Error('Correction request not found');
        }
        return correctionRequest;
    }
    async rejectCorrectionRequest(rejectCorrectionRequestDto, currentUserId) {
        const { correctionRequestId, reason } = rejectCorrectionRequestDto;
        const correctionRequest = await this.correctionRequestModel
            .findByIdAndUpdate(correctionRequestId, {
            status: enums_1.CorrectionRequestStatus.REJECTED,
            ...(reason && { reason }),
            updatedBy: currentUserId,
        }, { new: true })
            .exec();
        if (!correctionRequest) {
            throw new Error('Correction request not found');
        }
        return correctionRequest;
    }
    async createTimeException(createTimeExceptionDto, currentUserId) {
        const newTimeException = new this.timeExceptionModel({
            ...createTimeExceptionDto,
            createdBy: currentUserId,
            updatedBy: currentUserId,
        });
        return newTimeException.save();
    }
    async updateTimeException(id, updateTimeExceptionDto, currentUserId) {
        return this.timeExceptionModel.findByIdAndUpdate(id, {
            ...updateTimeExceptionDto,
            updatedBy: currentUserId,
        }, { new: true });
    }
    async getTimeExceptionsByEmployee(employeeId, getTimeExceptionsDto, currentUserId) {
        const { status } = getTimeExceptionsDto;
        const query = { employeeId };
        if (status) {
            query.status = status;
        }
        return this.timeExceptionModel.find(query).exec();
    }
    async approveTimeException(approveTimeExceptionDto, currentUserId) {
        const { timeExceptionId } = approveTimeExceptionDto;
        return this.timeExceptionModel.findByIdAndUpdate(timeExceptionId, {
            status: 'APPROVED',
            updatedBy: currentUserId,
        }, { new: true });
    }
    async rejectTimeException(rejectTimeExceptionDto, currentUserId) {
        const { timeExceptionId } = rejectTimeExceptionDto;
        return this.timeExceptionModel.findByIdAndUpdate(timeExceptionId, {
            status: 'REJECTED',
            updatedBy: currentUserId,
        }, { new: true });
    }
    async escalateTimeException(escalateTimeExceptionDto, currentUserId) {
        const { timeExceptionId } = escalateTimeExceptionDto;
        return this.timeExceptionModel.findByIdAndUpdate(timeExceptionId, {
            status: 'ESCALATED',
            updatedBy: currentUserId,
        }, { new: true });
    }
    async recordPunchWithMetadata(recordPunchWithMetadataDto, currentUserId) {
        const punchesWithDates = recordPunchWithMetadataDto.punches.map((punch) => ({
            type: punch.type,
            time: punch.time instanceof Date ? punch.time : new Date(punch.time),
        }));
        const attendanceRecord = new this.attendanceRecordModel({
            employeeId: recordPunchWithMetadataDto.employeeId,
            punches: punchesWithDates,
            totalWorkMinutes: this.calculateWorkMinutesFromPunches(punchesWithDates),
            hasMissedPunch: recordPunchWithMetadataDto.punches.length % 2 !== 0,
            finalisedForPayroll: false,
            createdBy: currentUserId,
            updatedBy: currentUserId,
        });
        await attendanceRecord.save();
        await this.logAttendanceChange(recordPunchWithMetadataDto.employeeId, 'PUNCH_RECORDED', {
            attendanceRecordId: attendanceRecord._id,
            deviceId: recordPunchWithMetadataDto.deviceId,
            location: recordPunchWithMetadataDto.location,
            source: recordPunchWithMetadataDto.source ?? 'manual',
        }, currentUserId);
        return attendanceRecord;
    }
    async recordPunchFromDevice(recordPunchWithMetadataDto, currentUserId) {
        return this.recordPunchWithMetadata({
            ...recordPunchWithMetadataDto,
            source: recordPunchWithMetadataDto.source ?? 'device',
        }, currentUserId);
    }
    async enforcePunchPolicy(enforcePunchPolicyDto, currentUserId) {
        if (enforcePunchPolicyDto.policy === 'FIRST_LAST' &&
            enforcePunchPolicyDto.punches.length > 2) {
            throw new Error('First/Last policy allows only two punches per period.');
        }
        const alternatingTypes = enforcePunchPolicyDto.punches.every((punch, index, arr) => {
            if (index === 0) {
                return true;
            }
            return arr[index - 1].type !== punch.type;
        });
        if (!alternatingTypes) {
            throw new Error('Punch sequence must alternate between IN and OUT.');
        }
        return { valid: true, policy: enforcePunchPolicyDto.policy };
    }
    async applyAttendanceRounding(applyAttendanceRoundingDto, currentUserId) {
        const attendanceRecord = await this.attendanceRecordModel.findById(applyAttendanceRoundingDto.attendanceRecordId);
        if (!attendanceRecord) {
            throw new Error('Attendance record not found');
        }
        const roundedMinutes = this.roundMinutes(attendanceRecord.totalWorkMinutes, applyAttendanceRoundingDto.intervalMinutes, applyAttendanceRoundingDto.strategy);
        attendanceRecord.totalWorkMinutes = roundedMinutes;
        attendanceRecord.updatedBy = currentUserId;
        await attendanceRecord.save();
        await this.logAttendanceChange(attendanceRecord.employeeId.toString(), 'ATTENDANCE_ROUNDED', {
            strategy: applyAttendanceRoundingDto.strategy,
            interval: applyAttendanceRoundingDto.intervalMinutes,
        }, currentUserId);
        return attendanceRecord;
    }
    async enforceShiftPunchPolicy(enforceShiftPunchPolicyDto, currentUserId) {
        const startMinutes = this.timeStringToMinutes(enforceShiftPunchPolicyDto.shiftStart);
        const endMinutes = this.timeStringToMinutes(enforceShiftPunchPolicyDto.shiftEnd);
        const allowEarly = enforceShiftPunchPolicyDto.allowEarlyMinutes ?? 0;
        const allowLate = enforceShiftPunchPolicyDto.allowLateMinutes ?? 0;
        enforceShiftPunchPolicyDto.punches.forEach((punch) => {
            const punchTime = punch.time instanceof Date ? punch.time : new Date(punch.time);
            const punchMinutes = this.dateToMinutesUTC(punchTime);
            if (punchMinutes < startMinutes - allowEarly) {
                throw new Error('Punch occurs before the allowed start window.');
            }
            if (punchMinutes > endMinutes + allowLate) {
                throw new Error('Punch occurs after the allowed end window.');
            }
        });
        return { valid: true };
    }
    async monitorRepeatedLateness(monitorRepeatedLatenessDto, currentUserId) {
        const latenessCount = await this.timeExceptionModel.countDocuments({
            employeeId: monitorRepeatedLatenessDto.employeeId,
            type: enums_1.TimeExceptionType.LATE,
        });
        const exceeded = latenessCount >= monitorRepeatedLatenessDto.threshold;
        if (exceeded) {
            await this.triggerLatenessDisciplinary({
                employeeId: monitorRepeatedLatenessDto.employeeId,
                action: 'AUTO_ESCALATION',
            }, currentUserId);
        }
        return {
            employeeId: monitorRepeatedLatenessDto.employeeId,
            count: latenessCount,
            threshold: monitorRepeatedLatenessDto.threshold,
            exceeded,
        };
    }
    async triggerLatenessDisciplinary(triggerLatenessDisciplinaryDto, currentUserId) {
        await this.logTimeManagementChange('LATENESS_DISCIPLINARY', {
            employeeId: triggerLatenessDisciplinaryDto.employeeId,
            action: triggerLatenessDisciplinaryDto.action ?? 'MANUAL_TRIGGER',
        }, currentUserId);
        return { message: 'Disciplinary action logged.' };
    }
    async scheduleTimeDataBackup(currentUserId) {
        await this.logTimeManagementChange('BACKUP', { action: 'SCHEDULED' }, currentUserId);
        return { message: 'Time management backup scheduled.' };
    }
    async checkExpiringShiftAssignments(daysBeforeExpiry = 7, currentUserId) {
        const now = new Date();
        const expiryDate = new Date(now);
        expiryDate.setUTCDate(expiryDate.getUTCDate() + daysBeforeExpiry);
        const expiryDateUTC = this.convertDateToUTCEnd(expiryDate);
        const nowUTC = this.convertDateToUTCStart(now);
        const expiringAssignments = await this.shiftAssignmentModel
            .find({
            endDate: { $lte: expiryDateUTC, $gte: nowUTC },
            status: 'APPROVED',
        })
            .populate('employeeId')
            .exec();
        const expiring = expiringAssignments.map((assignment) => ({
            employeeId: assignment.employeeId?._id?.toString() || '',
            shiftId: assignment._id,
            endDate: assignment.endDate,
        }));
        await this.logTimeManagementChange('SHIFT_EXPIRY_SCAN', { count: expiring.length }, currentUserId);
        return { count: expiring.length, assignments: expiring };
    }
    async detectMissedPunches(currentUserId) {
        const now = new Date();
        const todayUTC = this.convertDateToUTCStart(now);
        const tomorrowUTC = new Date(todayUTC);
        tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1);
        const attendanceRecords = await this.attendanceRecordModel
            .find({
            createdAt: { $gte: todayUTC, $lt: tomorrowUTC },
        })
            .exec();
        const missedPunchRecords = [];
        for (const record of attendanceRecords) {
            if (record.punches.length === 0 || record.punches.length % 2 !== 0) {
                record.hasMissedPunch = true;
                record.updatedBy = currentUserId;
                await record.save();
                missedPunchRecords.push(record);
            }
        }
        return { count: missedPunchRecords.length, records: missedPunchRecords };
    }
    async escalateUnresolvedRequestsBeforePayroll(payrollCutOffDate, currentUserId) {
        const now = new Date();
        if (now >= payrollCutOffDate) {
            const pendingCorrections = await this.correctionRequestModel
                .find({
                status: { $in: ['SUBMITTED', 'IN_REVIEW'] },
            })
                .exec();
            const pendingExceptions = await this.timeExceptionModel
                .find({
                status: { $in: ['PENDING', 'OPEN'] },
            })
                .exec();
            const escalated = [];
            for (const correction of pendingCorrections) {
                await this.correctionRequestModel.findByIdAndUpdate(correction._id, {
                    status: enums_1.CorrectionRequestStatus.ESCALATED,
                    updatedBy: currentUserId,
                });
                escalated.push({ type: 'CORRECTION_REQUEST', id: correction._id });
            }
            for (const exception of pendingExceptions) {
                await this.timeExceptionModel.findByIdAndUpdate(exception._id, {
                    status: 'ESCALATED',
                    updatedBy: currentUserId,
                });
                escalated.push({ type: 'TIME_EXCEPTION', id: exception._id });
            }
            return { count: escalated.length, escalated };
        }
        return { count: 0, escalated: [] };
    }
    async generateOvertimeReport(generateOvertimeReportDto, currentUserId) {
        const { employeeId, startDate, endDate } = generateOvertimeReportDto;
        const query = {
            type: enums_1.TimeExceptionType.OVERTIME_REQUEST,
        };
        if (employeeId) {
            query.employeeId = employeeId;
        }
        if (startDate && endDate) {
            const startDateUTC = this.convertDateToUTCStart(startDate);
            const endDateUTC = this.convertDateToUTCEnd(endDate);
            query.createdAt = { $gte: startDateUTC, $lte: endDateUTC };
        }
        const overtimeExceptions = await this.timeExceptionModel
            .find(query)
            .populate('employeeId', 'name email')
            .populate('attendanceRecordId')
            .exec();
        const totalOvertimeMinutes = overtimeExceptions.reduce((total, exception) => {
            const record = exception.attendanceRecordId;
            if (record && record.totalWorkMinutes) {
                const standardMinutes = 480;
                const overtime = Math.max(0, record.totalWorkMinutes - standardMinutes);
                return total + overtime;
            }
            return total;
        }, 0);
        await this.logTimeManagementChange('OVERTIME_REPORT_GENERATED', {
            employeeId,
            startDate,
            endDate,
            count: overtimeExceptions.length,
            totalOvertimeMinutes,
        }, currentUserId);
        return {
            employeeId,
            startDate,
            endDate,
            records: overtimeExceptions,
            summary: {
                totalRecords: overtimeExceptions.length,
                totalOvertimeMinutes,
                totalOvertimeHours: Math.round((totalOvertimeMinutes / 60) * 100) / 100,
            },
        };
    }
    async generateLatenessReport(generateLatenessReportDto, currentUserId) {
        const { employeeId, startDate, endDate } = generateLatenessReportDto;
        const query = {
            type: enums_1.TimeExceptionType.LATE,
        };
        if (employeeId) {
            query.employeeId = employeeId;
        }
        if (startDate && endDate) {
            const startDateUTC = this.convertDateToUTCStart(startDate);
            const endDateUTC = this.convertDateToUTCEnd(endDate);
            query.createdAt = { $gte: startDateUTC, $lte: endDateUTC };
        }
        const latenessExceptions = await this.timeExceptionModel
            .find(query)
            .populate('employeeId', 'name email')
            .populate('attendanceRecordId')
            .exec();
        await this.logTimeManagementChange('LATENESS_REPORT_GENERATED', {
            employeeId,
            startDate,
            endDate,
            count: latenessExceptions.length,
        }, currentUserId);
        return {
            employeeId,
            startDate,
            endDate,
            records: latenessExceptions,
            summary: {
                totalRecords: latenessExceptions.length,
                employees: [
                    ...new Set(latenessExceptions.map((e) => e.employeeId?._id?.toString())),
                ].length,
            },
        };
    }
    async generateExceptionReport(generateExceptionReportDto, currentUserId) {
        const { employeeId, startDate, endDate } = generateExceptionReportDto;
        const query = {};
        if (employeeId) {
            query.employeeId = employeeId;
        }
        if (startDate && endDate) {
            const startDateUTC = this.convertDateToUTCStart(startDate);
            const endDateUTC = this.convertDateToUTCEnd(endDate);
            query.createdAt = { $gte: startDateUTC, $lte: endDateUTC };
        }
        const exceptions = await this.timeExceptionModel
            .find(query)
            .populate('employeeId', 'name email')
            .populate('attendanceRecordId')
            .exec();
        const byType = {};
        exceptions.forEach((exception) => {
            const type = exception.type;
            if (!byType[type]) {
                byType[type] = [];
            }
            byType[type].push(exception);
        });
        await this.logTimeManagementChange('EXCEPTION_REPORT_GENERATED', {
            employeeId,
            startDate,
            endDate,
            count: exceptions.length,
        }, currentUserId);
        return {
            employeeId,
            startDate,
            endDate,
            records: exceptions,
            summary: {
                totalRecords: exceptions.length,
                byType: Object.keys(byType).map((type) => ({
                    type,
                    count: byType[type].length,
                })),
            },
        };
    }
    async exportReport(exportReportDto, currentUserId) {
        let reportData;
        if (exportReportDto.reportType === 'overtime') {
            reportData = await this.generateOvertimeReport({
                employeeId: exportReportDto.employeeId,
                startDate: exportReportDto.startDate,
                endDate: exportReportDto.endDate,
            }, currentUserId);
        }
        else if (exportReportDto.reportType === 'lateness') {
            reportData = await this.generateLatenessReport({
                employeeId: exportReportDto.employeeId,
                startDate: exportReportDto.startDate,
                endDate: exportReportDto.endDate,
            }, currentUserId);
        }
        else if (exportReportDto.reportType === 'exception') {
            reportData = await this.generateExceptionReport({
                employeeId: exportReportDto.employeeId,
                startDate: exportReportDto.startDate,
                endDate: exportReportDto.endDate,
            }, currentUserId);
        }
        else {
            throw new Error('Invalid report type');
        }
        let formattedData;
        if (exportReportDto.format === 'csv') {
            formattedData = this.formatAsCSV(reportData);
        }
        else if (exportReportDto.format === 'text') {
            formattedData = this.formatAsText(reportData);
        }
        else {
            formattedData = JSON.stringify(reportData, null, 2);
        }
        await this.logTimeManagementChange('REPORT_EXPORTED', {
            reportType: exportReportDto.reportType,
            format: exportReportDto.format,
            employeeId: exportReportDto.employeeId,
        }, currentUserId);
        return {
            format: exportReportDto.format,
            data: formattedData,
            reportType: exportReportDto.reportType,
            generatedAt: new Date(),
        };
    }
    async logTimeManagementChange(entity, changeSet, actorId) {
        this.auditLogs.push({
            entity,
            changeSet,
            actorId,
            timestamp: new Date(),
        });
    }
    async logAttendanceChange(employeeId, action, payload, actorId) {
        await this.logTimeManagementChange('ATTENDANCE', { employeeId, action, ...payload }, actorId);
    }
    calculateWorkMinutesFromPunches(punches) {
        let totalMinutes = 0;
        for (let i = 0; i < punches.length; i += 2) {
            const inPunch = punches[i];
            const outPunch = punches[i + 1];
            if (inPunch && outPunch) {
                totalMinutes +=
                    (outPunch.time.getTime() - inPunch.time.getTime()) / 60000;
            }
        }
        return totalMinutes;
    }
    roundMinutes(value, interval, strategy) {
        if (interval <= 0) {
            return value;
        }
        if (strategy === 'NEAREST') {
            return Math.round(value / interval) * interval;
        }
        if (strategy === 'CEILING') {
            return Math.ceil(value / interval) * interval;
        }
        return Math.floor(value / interval) * interval;
    }
    timeStringToMinutes(time) {
        const [hours, minutes] = time
            .split(':')
            .map((value) => parseInt(value, 10));
        return hours * 60 + minutes;
    }
    dateToMinutes(date) {
        return date.getHours() * 60 + date.getMinutes();
    }
    dateToMinutesUTC(date) {
        return date.getUTCHours() * 60 + date.getUTCMinutes();
    }
    convertDateToUTCStart(date) {
        const dateObj = date instanceof Date ? date : new Date(date);
        return new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 0, 0, 0, 0));
    }
    convertDateToUTCEnd(date) {
        const dateObj = date instanceof Date ? date : new Date(date);
        return new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate(), 23, 59, 59, 999));
    }
    formatAsCSV(data) {
        const lines = [];
        if (data.summary) {
            lines.push('Summary');
            Object.keys(data.summary).forEach((key) => {
                lines.push(`${key},${data.summary[key]}`);
            });
            lines.push('');
        }
        if (data.records && data.records.length > 0) {
            lines.push('Records');
            const firstRecord = data.records[0];
            const headers = Object.keys(firstRecord).join(',');
            lines.push(headers);
            data.records.forEach((record) => {
                const values = Object.values(record).map((v) => {
                    if (v && typeof v === 'object') {
                        return JSON.stringify(v);
                    }
                    return v || '';
                });
                lines.push(values.join(','));
            });
        }
        return lines.join('\n');
    }
    formatAsText(data) {
        const lines = [];
        lines.push(`Report Type: ${data.reportType || 'N/A'}`);
        lines.push(`Generated: ${new Date().toISOString()}`);
        if (data.startDate)
            lines.push(`Start Date: ${data.startDate}`);
        if (data.endDate)
            lines.push(`End Date: ${data.endDate}`);
        lines.push('');
        if (data.summary) {
            lines.push('Summary:');
            Object.keys(data.summary).forEach((key) => {
                lines.push(`  ${key}: ${data.summary[key]}`);
            });
            lines.push('');
        }
        if (data.records && data.records.length > 0) {
            lines.push(`Records (${data.records.length}):`);
            data.records.forEach((record, index) => {
                lines.push(`  Record ${index + 1}:`);
                Object.keys(record).forEach((key) => {
                    const value = record[key];
                    if (value && typeof value === 'object') {
                        lines.push(`    ${key}: ${JSON.stringify(value)}`);
                    }
                    else {
                        lines.push(`    ${key}: ${value || 'N/A'}`);
                    }
                });
                lines.push('');
            });
        }
        return lines.join('\n');
    }
};
exports.TimeManagementService = TimeManagementService;
exports.TimeManagementService = TimeManagementService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(attendance_record_schema_1.AttendanceRecord.name)),
    __param(1, (0, mongoose_1.InjectModel)(attendance_correction_request_schema_1.AttendanceCorrectionRequest.name)),
    __param(2, (0, mongoose_1.InjectModel)(time_exception_schema_1.TimeException.name)),
    __param(3, (0, mongoose_1.InjectModel)(shift_assignment_schema_1.ShiftAssignment.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], TimeManagementService);
//# sourceMappingURL=time-management.service.js.map