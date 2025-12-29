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
exports.NotificationAndSyncController = void 0;
const common_1 = require("@nestjs/common");
const notification_service_1 = require("../services/notification.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const employee_profile_enums_1 = require("../../employee-profile/enums/employee-profile.enums");
const notification_and_sync_dtos_1 = require("../dtos/notification-and-sync.dtos");
let NotificationAndSyncController = class NotificationAndSyncController {
    constructor(notificationService) {
        this.notificationService = notificationService;
    }
    async sendNotification(sendNotificationDto, user) {
        return this.notificationService.sendNotification(sendNotificationDto, user.userId);
    }
    async getNotificationLogsByEmployee(employeeId, user) {
        if (user.roles.includes(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE) &&
            user.userId !== employeeId) {
            throw new Error('Access denied');
        }
        return this.notificationService.getNotificationLogsByEmployee({
            employeeId,
        }, user.userId);
    }
    async syncAttendanceWithPayroll(syncAttendanceWithPayrollDto, user) {
        return this.notificationService.syncAttendanceWithPayroll(syncAttendanceWithPayrollDto, user.userId);
    }
    async syncLeaveWithPayroll(syncLeaveWithPayrollDto, user) {
        return this.notificationService.syncLeaveWithPayroll(syncLeaveWithPayrollDto, user.userId);
    }
    async synchronizeAttendanceAndPayroll(synchronizeAttendanceAndPayrollDto, user) {
        return this.notificationService.synchronizeAttendanceAndPayroll(synchronizeAttendanceAndPayrollDto, user.userId);
    }
    async getAttendanceDataForSync(employeeId, startDate, endDate, user) {
        return this.notificationService.getAttendanceDataForSync(employeeId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined, user.userId);
    }
    async getOvertimeDataForSync(employeeId, startDate, endDate, user) {
        return this.notificationService.getOvertimeDataForSync(employeeId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined, user.userId);
    }
};
exports.NotificationAndSyncController = NotificationAndSyncController;
__decorate([
    (0, common_1.Post)('notification'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [notification_and_sync_dtos_1.SendNotificationDto, Object]),
    __metadata("design:returntype", Promise)
], NotificationAndSyncController.prototype, "sendNotification", null);
__decorate([
    (0, common_1.Get)('notification/employee/:employeeId'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NotificationAndSyncController.prototype, "getNotificationLogsByEmployee", null);
__decorate([
    (0, common_1.Post)('sync/attendance'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [notification_and_sync_dtos_1.SyncAttendanceWithPayrollDto, Object]),
    __metadata("design:returntype", Promise)
], NotificationAndSyncController.prototype, "syncAttendanceWithPayroll", null);
__decorate([
    (0, common_1.Post)('sync/leave'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [notification_and_sync_dtos_1.SyncLeaveWithPayrollDto, Object]),
    __metadata("design:returntype", Promise)
], NotificationAndSyncController.prototype, "syncLeaveWithPayroll", null);
__decorate([
    (0, common_1.Post)('sync/attendance-leave'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [notification_and_sync_dtos_1.SynchronizeAttendanceAndPayrollDto, Object]),
    __metadata("design:returntype", Promise)
], NotificationAndSyncController.prototype, "synchronizeAttendanceAndPayroll", null);
__decorate([
    (0, common_1.Get)('sync/attendance/:employeeId'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], NotificationAndSyncController.prototype, "getAttendanceDataForSync", null);
__decorate([
    (0, common_1.Get)('sync/overtime/:employeeId'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], NotificationAndSyncController.prototype, "getOvertimeDataForSync", null);
exports.NotificationAndSyncController = NotificationAndSyncController = __decorate([
    (0, common_1.Controller)('notification-sync'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [notification_service_1.NotificationService])
], NotificationAndSyncController);
//# sourceMappingURL=notification.controller.js.map