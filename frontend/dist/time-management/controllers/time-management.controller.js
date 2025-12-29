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
exports.TimeManagementController = void 0;
const common_1 = require("@nestjs/common");
const time_management_service_1 = require("../services/time-management.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const employee_profile_enums_1 = require("../../employee-profile/enums/employee-profile.enums");
const attendance_dtos_1 = require("../DTOs/attendance.dtos");
const time_permission_dtos_1 = require("../DTOs/time-permission.dtos");
const reporting_dtos_1 = require("../DTOs/reporting.dtos");
let TimeManagementController = class TimeManagementController {
    constructor(timeManagementService) {
        this.timeManagementService = timeManagementService;
    }
    async clockInWithID(employeeId, user) {
        if (user.roles.includes(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE) &&
            user.userId !== employeeId) {
            throw new Error('Access denied');
        }
        return this.timeManagementService.clockInWithID(employeeId, user.userId);
    }
    async clockOutWithID(employeeId, user) {
        if (user.roles.includes(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE) &&
            user.userId !== employeeId) {
            throw new Error('Access denied');
        }
        return this.timeManagementService.clockOutWithID(employeeId, user.userId);
    }
    async createAttendanceRecord(createAttendanceRecordDto, user) {
        return this.timeManagementService.createAttendanceRecord(createAttendanceRecordDto, user.userId);
    }
    async updateAttendanceRecord(id, updateAttendanceRecordDto, user) {
        return this.timeManagementService.updateAttendanceRecord(id, updateAttendanceRecordDto, user.userId);
    }
    async submitAttendanceCorrectionRequest(submitCorrectionRequestDto, user) {
        if (user.roles.includes(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE) &&
            user.userId !== submitCorrectionRequestDto.employeeId) {
            throw new Error('Access denied');
        }
        return this.timeManagementService.submitAttendanceCorrectionRequest(submitCorrectionRequestDto, user.userId);
    }
    async getAllCorrectionRequests(getAllCorrectionsDto, user) {
        return this.timeManagementService.getAllCorrectionRequests(getAllCorrectionsDto, user.userId);
    }
    async approveCorrectionRequest(approveCorrectionRequestDto, user) {
        return this.timeManagementService.approveCorrectionRequest(approveCorrectionRequestDto, user.userId);
    }
    async rejectCorrectionRequest(rejectCorrectionRequestDto, user) {
        return this.timeManagementService.rejectCorrectionRequest(rejectCorrectionRequestDto, user.userId);
    }
    async recordPunchWithMetadata(recordPunchWithMetadataDto, user) {
        if (user.roles.includes(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE) &&
            user.userId !== recordPunchWithMetadataDto.employeeId) {
            throw new Error('Access denied');
        }
        return this.timeManagementService.recordPunchWithMetadata(recordPunchWithMetadataDto, user.userId);
    }
    async recordPunchFromDevice(recordPunchWithMetadataDto, user) {
        if (user.roles.includes(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE) &&
            user.userId !== recordPunchWithMetadataDto.employeeId) {
            throw new Error('Access denied');
        }
        return this.timeManagementService.recordPunchFromDevice(recordPunchWithMetadataDto, user.userId);
    }
    async enforcePunchPolicy(enforcePunchPolicyDto, user) {
        return this.timeManagementService.enforcePunchPolicy(enforcePunchPolicyDto, user.userId);
    }
    async applyAttendanceRounding(applyAttendanceRoundingDto, user) {
        return this.timeManagementService.applyAttendanceRounding(applyAttendanceRoundingDto, user.userId);
    }
    async enforceShiftPunchPolicy(enforceShiftPunchPolicyDto, user) {
        return this.timeManagementService.enforceShiftPunchPolicy(enforceShiftPunchPolicyDto, user.userId);
    }
    async createTimeException(createTimeExceptionDto, user) {
        if (user.roles.includes(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE) &&
            user.userId !== createTimeExceptionDto.employeeId) {
            throw new Error('Access denied');
        }
        return this.timeManagementService.createTimeException(createTimeExceptionDto, user.userId);
    }
    async updateTimeException(id, updateTimeExceptionDto, user) {
        return this.timeManagementService.updateTimeException(id, updateTimeExceptionDto, user.userId);
    }
    async getTimeExceptionsByEmployee(id, getTimeExceptionsByEmployeeDto, user) {
        if (user.roles.includes(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE) &&
            user.userId !== id) {
            throw new Error('Access denied');
        }
        return this.timeManagementService.getTimeExceptionsByEmployee(id, getTimeExceptionsByEmployeeDto, user.userId);
    }
    async approveTimeException(approveTimeExceptionDto, user) {
        return this.timeManagementService.approveTimeException(approveTimeExceptionDto, user.userId);
    }
    async rejectTimeException(rejectTimeExceptionDto, user) {
        return this.timeManagementService.rejectTimeException(rejectTimeExceptionDto, user.userId);
    }
    async escalateTimeException(escalateTimeExceptionDto, user) {
        return this.timeManagementService.escalateTimeException(escalateTimeExceptionDto, user.userId);
    }
    async checkExpiringShiftAssignments(body, user) {
        return this.timeManagementService.checkExpiringShiftAssignments(body.daysBeforeExpiry || 7, user.userId);
    }
    async detectMissedPunches(user) {
        return this.timeManagementService.detectMissedPunches(user.userId);
    }
    async escalateUnresolvedRequestsBeforePayroll(body, user) {
        return this.timeManagementService.escalateUnresolvedRequestsBeforePayroll(new Date(body.payrollCutOffDate), user.userId);
    }
    async monitorRepeatedLateness(monitorRepeatedLatenessDto, user) {
        return this.timeManagementService.monitorRepeatedLateness(monitorRepeatedLatenessDto, user.userId);
    }
    async triggerLatenessDisciplinary(triggerLatenessDisciplinaryDto, user) {
        return this.timeManagementService.triggerLatenessDisciplinary(triggerLatenessDisciplinaryDto, user.userId);
    }
    async scheduleTimeDataBackup(user) {
        return this.timeManagementService.scheduleTimeDataBackup(user.userId);
    }
    async generateOvertimeReport(generateOvertimeReportDto, user) {
        return this.timeManagementService.generateOvertimeReport(generateOvertimeReportDto, user.userId);
    }
    async generateLatenessReport(generateLatenessReportDto, user) {
        return this.timeManagementService.generateLatenessReport(generateLatenessReportDto, user.userId);
    }
    async generateExceptionReport(generateExceptionReportDto, user) {
        return this.timeManagementService.generateExceptionReport(generateExceptionReportDto, user.userId);
    }
    async exportReport(exportReportDto, user) {
        return this.timeManagementService.exportReport(exportReportDto, user.userId);
    }
};
exports.TimeManagementController = TimeManagementController;
__decorate([
    (0, common_1.Post)('clock-in/:employeeId'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "clockInWithID", null);
__decorate([
    (0, common_1.Post)('clock-out/:employeeId'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "clockOutWithID", null);
__decorate([
    (0, common_1.Post)('attendance'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [attendance_dtos_1.CreateAttendanceRecordDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "createAttendanceRecord", null);
__decorate([
    (0, common_1.Put)('attendance/:id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, attendance_dtos_1.UpdateAttendanceRecordDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "updateAttendanceRecord", null);
__decorate([
    (0, common_1.Post)('attendance/correction'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [attendance_dtos_1.SubmitCorrectionRequestDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "submitAttendanceCorrectionRequest", null);
__decorate([
    (0, common_1.Get)('attendance/corrections'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [attendance_dtos_1.GetAllCorrectionsDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "getAllCorrectionRequests", null);
__decorate([
    (0, common_1.Post)('attendance/corrections/approve'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [attendance_dtos_1.ApproveCorrectionRequestDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "approveCorrectionRequest", null);
__decorate([
    (0, common_1.Post)('attendance/corrections/reject'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [attendance_dtos_1.RejectCorrectionRequestDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "rejectCorrectionRequest", null);
__decorate([
    (0, common_1.Post)('attendance/punch/metadata'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [time_permission_dtos_1.RecordPunchWithMetadataDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "recordPunchWithMetadata", null);
__decorate([
    (0, common_1.Post)('attendance/punch/device'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [time_permission_dtos_1.RecordPunchWithMetadataDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "recordPunchFromDevice", null);
__decorate([
    (0, common_1.Post)('attendance/enforce-punch-policy'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [time_permission_dtos_1.EnforcePunchPolicyDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "enforcePunchPolicy", null);
__decorate([
    (0, common_1.Post)('attendance/rounding'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [time_permission_dtos_1.ApplyAttendanceRoundingDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "applyAttendanceRounding", null);
__decorate([
    (0, common_1.Post)('attendance/enforce-shift-policy'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [time_permission_dtos_1.EnforceShiftPunchPolicyDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "enforceShiftPunchPolicy", null);
__decorate([
    (0, common_1.Post)('time-exception'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_MANAGER),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [attendance_dtos_1.CreateTimeExceptionDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "createTimeException", null);
__decorate([
    (0, common_1.Put)('time-exception/:id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, attendance_dtos_1.UpdateTimeExceptionDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "updateTimeException", null);
__decorate([
    (0, common_1.Get)('time-exception/employee/:id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, attendance_dtos_1.GetTimeExceptionsByEmployeeDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "getTimeExceptionsByEmployee", null);
__decorate([
    (0, common_1.Post)('time-exception/approve'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [attendance_dtos_1.ApproveTimeExceptionDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "approveTimeException", null);
__decorate([
    (0, common_1.Post)('time-exception/reject'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [attendance_dtos_1.RejectTimeExceptionDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "rejectTimeException", null);
__decorate([
    (0, common_1.Post)('time-exception/escalate'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [attendance_dtos_1.EscalateTimeExceptionDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "escalateTimeException", null);
__decorate([
    (0, common_1.Post)('automation/check-expiring-shifts'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "checkExpiringShiftAssignments", null);
__decorate([
    (0, common_1.Post)('automation/detect-missed-punches'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "detectMissedPunches", null);
__decorate([
    (0, common_1.Post)('automation/escalate-before-payroll'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "escalateUnresolvedRequestsBeforePayroll", null);
__decorate([
    (0, common_1.Post)('automation/monitor-lateness'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [time_permission_dtos_1.MonitorRepeatedLatenessDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "monitorRepeatedLateness", null);
__decorate([
    (0, common_1.Post)('automation/trigger-lateness'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [time_permission_dtos_1.TriggerLatenessDisciplinaryDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "triggerLatenessDisciplinary", null);
__decorate([
    (0, common_1.Post)('automation/schedule-backup'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "scheduleTimeDataBackup", null);
__decorate([
    (0, common_1.Post)('reports/overtime'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reporting_dtos_1.GenerateOvertimeReportDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "generateOvertimeReport", null);
__decorate([
    (0, common_1.Post)('reports/lateness'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reporting_dtos_1.GenerateLatenessReportDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "generateLatenessReport", null);
__decorate([
    (0, common_1.Post)('reports/exception'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reporting_dtos_1.GenerateExceptionReportDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "generateExceptionReport", null);
__decorate([
    (0, common_1.Post)('reports/export'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reporting_dtos_1.ExportReportDto, Object]),
    __metadata("design:returntype", Promise)
], TimeManagementController.prototype, "exportReport", null);
exports.TimeManagementController = TimeManagementController = __decorate([
    (0, common_1.Controller)('time-management'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [time_management_service_1.TimeManagementService])
], TimeManagementController);
//# sourceMappingURL=time-management.controller.js.map