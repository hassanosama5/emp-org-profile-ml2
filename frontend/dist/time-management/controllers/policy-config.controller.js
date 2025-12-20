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
exports.PolicyConfigController = void 0;
const common_1 = require("@nestjs/common");
const policy_config_service_1 = require("../services/policy-config.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const employee_profile_enums_1 = require("../../employee-profile/enums/employee-profile.enums");
const policy_config_dtos_1 = require("../DTOs/policy-config.dtos");
let PolicyConfigController = class PolicyConfigController {
    constructor(policyConfigService) {
        this.policyConfigService = policyConfigService;
    }
    async createOvertimeRule(createOvertimeRuleDto, user) {
        return this.policyConfigService.createOvertimeRule(createOvertimeRuleDto, user.userId);
    }
    async getOvertimeRules(getPoliciesDto, user) {
        return this.policyConfigService.getOvertimeRules(getPoliciesDto, user.userId);
    }
    async getOvertimeRuleById(id, user) {
        return this.policyConfigService.getOvertimeRuleById(id, user.userId);
    }
    async updateOvertimeRule(id, updateOvertimeRuleDto, user) {
        return this.policyConfigService.updateOvertimeRule(id, updateOvertimeRuleDto, user.userId);
    }
    async deleteOvertimeRule(id, user) {
        return this.policyConfigService.deleteOvertimeRule(id, user.userId);
    }
    async createLatenessRule(createLatenessRuleDto, user) {
        return this.policyConfigService.createLatenessRule(createLatenessRuleDto, user.userId);
    }
    async getLatenessRules(getPoliciesDto, user) {
        return this.policyConfigService.getLatenessRules(getPoliciesDto, user.userId);
    }
    async getLatenessRuleById(id, user) {
        return this.policyConfigService.getLatenessRuleById(id, user.userId);
    }
    async updateLatenessRule(id, updateLatenessRuleDto, user) {
        return this.policyConfigService.updateLatenessRule(id, updateLatenessRuleDto, user.userId);
    }
    async deleteLatenessRule(id, user) {
        return this.policyConfigService.deleteLatenessRule(id, user.userId);
    }
    async createHoliday(createHolidayDto, user) {
        return this.policyConfigService.createHoliday(createHolidayDto, user.userId);
    }
    async getHolidays(getHolidaysDto, user) {
        return this.policyConfigService.getHolidays(getHolidaysDto, user.userId);
    }
    async getUpcomingHolidays(days, user) {
        return this.policyConfigService.getUpcomingHolidays(days || 30, user?.userId);
    }
    async getHolidayById(id, user) {
        return this.policyConfigService.getHolidayById(id, user.userId);
    }
    async updateHoliday(id, updateHolidayDto, user) {
        return this.policyConfigService.updateHoliday(id, updateHolidayDto, user.userId);
    }
    async deleteHoliday(id, user) {
        return this.policyConfigService.deleteHoliday(id, user.userId);
    }
    async checkHoliday(checkHolidayDto, user) {
        return this.policyConfigService.checkHoliday(checkHolidayDto, user.userId);
    }
    async validateAttendanceHoliday(validateAttendanceHolidayDto, user) {
        return this.policyConfigService.validateAttendanceHoliday(validateAttendanceHolidayDto, user.userId);
    }
};
exports.PolicyConfigController = PolicyConfigController;
__decorate([
    (0, common_1.Post)('overtime'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [policy_config_dtos_1.CreateOvertimeRuleDto, Object]),
    __metadata("design:returntype", Promise)
], PolicyConfigController.prototype, "createOvertimeRule", null);
__decorate([
    (0, common_1.Get)('overtime'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [policy_config_dtos_1.GetPoliciesDto, Object]),
    __metadata("design:returntype", Promise)
], PolicyConfigController.prototype, "getOvertimeRules", null);
__decorate([
    (0, common_1.Get)('overtime/:id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PolicyConfigController.prototype, "getOvertimeRuleById", null);
__decorate([
    (0, common_1.Put)('overtime/:id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, policy_config_dtos_1.UpdateOvertimeRuleDto, Object]),
    __metadata("design:returntype", Promise)
], PolicyConfigController.prototype, "updateOvertimeRule", null);
__decorate([
    (0, common_1.Delete)('overtime/:id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PolicyConfigController.prototype, "deleteOvertimeRule", null);
__decorate([
    (0, common_1.Post)('lateness'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [policy_config_dtos_1.CreateLatenessRuleDto, Object]),
    __metadata("design:returntype", Promise)
], PolicyConfigController.prototype, "createLatenessRule", null);
__decorate([
    (0, common_1.Get)('lateness'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [policy_config_dtos_1.GetPoliciesDto, Object]),
    __metadata("design:returntype", Promise)
], PolicyConfigController.prototype, "getLatenessRules", null);
__decorate([
    (0, common_1.Get)('lateness/:id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PolicyConfigController.prototype, "getLatenessRuleById", null);
__decorate([
    (0, common_1.Put)('lateness/:id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, policy_config_dtos_1.UpdateLatenessRuleDto, Object]),
    __metadata("design:returntype", Promise)
], PolicyConfigController.prototype, "updateLatenessRule", null);
__decorate([
    (0, common_1.Delete)('lateness/:id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PolicyConfigController.prototype, "deleteLatenessRule", null);
__decorate([
    (0, common_1.Post)('holiday'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [policy_config_dtos_1.CreateHolidayDto, Object]),
    __metadata("design:returntype", Promise)
], PolicyConfigController.prototype, "createHoliday", null);
__decorate([
    (0, common_1.Get)('holiday'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [policy_config_dtos_1.GetHolidaysDto, Object]),
    __metadata("design:returntype", Promise)
], PolicyConfigController.prototype, "getHolidays", null);
__decorate([
    (0, common_1.Get)('holiday/upcoming'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Query)('days')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], PolicyConfigController.prototype, "getUpcomingHolidays", null);
__decorate([
    (0, common_1.Get)('holiday/:id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PolicyConfigController.prototype, "getHolidayById", null);
__decorate([
    (0, common_1.Put)('holiday/:id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, policy_config_dtos_1.UpdateHolidayDto, Object]),
    __metadata("design:returntype", Promise)
], PolicyConfigController.prototype, "updateHoliday", null);
__decorate([
    (0, common_1.Delete)('holiday/:id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PolicyConfigController.prototype, "deleteHoliday", null);
__decorate([
    (0, common_1.Post)('holiday/check'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [policy_config_dtos_1.CheckHolidayDto, Object]),
    __metadata("design:returntype", Promise)
], PolicyConfigController.prototype, "checkHoliday", null);
__decorate([
    (0, common_1.Post)('holiday/validate-attendance'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [policy_config_dtos_1.ValidateAttendanceHolidayDto, Object]),
    __metadata("design:returntype", Promise)
], PolicyConfigController.prototype, "validateAttendanceHoliday", null);
exports.PolicyConfigController = PolicyConfigController = __decorate([
    (0, common_1.Controller)('policy-config'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [policy_config_service_1.PolicyConfigService])
], PolicyConfigController);
//# sourceMappingURL=policy-config.controller.js.map