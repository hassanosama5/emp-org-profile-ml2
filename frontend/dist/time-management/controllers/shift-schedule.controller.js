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
exports.ShiftAndScheduleController = void 0;
const common_1 = require("@nestjs/common");
const shift_schedule_service_1 = require("../services/shift-schedule.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const employee_profile_enums_1 = require("../../employee-profile/enums/employee-profile.enums");
const shift_dtos_1 = require("../DTOs/shift.dtos");
let ShiftAndScheduleController = class ShiftAndScheduleController {
    constructor(shiftScheduleService) {
        this.shiftScheduleService = shiftScheduleService;
    }
    async createShiftType(createShiftTypeDto, user) {
        return this.shiftScheduleService.createShiftType(createShiftTypeDto, user.userId);
    }
    async createShift(createShiftDto, user) {
        return this.shiftScheduleService.createShift(createShiftDto, user.userId);
    }
    async updateShift(id, updateShiftDto, user) {
        return this.shiftScheduleService.updateShift(id, updateShiftDto, user.userId);
    }
    async assignShiftToEmployee(assignShiftToEmployeeDto, user) {
        return this.shiftScheduleService.assignShiftToEmployee(assignShiftToEmployeeDto, user.userId);
    }
    async createScheduleRule(createScheduleRuleDto, user) {
        return this.shiftScheduleService.createScheduleRule(createScheduleRuleDto, user.userId);
    }
    async defineFlexibleSchedulingRules(defineFlexibleSchedulingRulesDto, user) {
        return this.shiftScheduleService.defineFlexibleSchedulingRules(defineFlexibleSchedulingRulesDto, user.userId);
    }
};
exports.ShiftAndScheduleController = ShiftAndScheduleController;
__decorate([
    (0, common_1.Post)('shift/type'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [shift_dtos_1.CreateShiftTypeDto, Object]),
    __metadata("design:returntype", Promise)
], ShiftAndScheduleController.prototype, "createShiftType", null);
__decorate([
    (0, common_1.Post)('shift'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [shift_dtos_1.CreateShiftDto, Object]),
    __metadata("design:returntype", Promise)
], ShiftAndScheduleController.prototype, "createShift", null);
__decorate([
    (0, common_1.Put)('shift/:id'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, shift_dtos_1.UpdateShiftDto, Object]),
    __metadata("design:returntype", Promise)
], ShiftAndScheduleController.prototype, "updateShift", null);
__decorate([
    (0, common_1.Post)('shift/assign'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.SYSTEM_ADMIN, employee_profile_enums_1.SystemRole.HR_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [shift_dtos_1.AssignShiftToEmployeeDto, Object]),
    __metadata("design:returntype", Promise)
], ShiftAndScheduleController.prototype, "assignShiftToEmployee", null);
__decorate([
    (0, common_1.Post)('schedule'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [shift_dtos_1.CreateScheduleRuleDto, Object]),
    __metadata("design:returntype", Promise)
], ShiftAndScheduleController.prototype, "createScheduleRule", null);
__decorate([
    (0, common_1.Post)('schedule/flexible'),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.SYSTEM_ADMIN),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [shift_dtos_1.DefineFlexibleSchedulingRulesDto, Object]),
    __metadata("design:returntype", Promise)
], ShiftAndScheduleController.prototype, "defineFlexibleSchedulingRules", null);
exports.ShiftAndScheduleController = ShiftAndScheduleController = __decorate([
    (0, common_1.Controller)('shift-schedule'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [shift_schedule_service_1.ShiftScheduleService])
], ShiftAndScheduleController);
//# sourceMappingURL=shift-schedule.controller.js.map