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
exports.LeaveController = void 0;
const CreateCalendar_dto_1 = require("./dto/CreateCalendar.dto");
const common_1 = require("@nestjs/common");
const leaves_service_1 = require("./leaves.service");
const CreateLeavePolicy_dto_1 = require("./dto/CreateLeavePolicy.dto");
const UpdateLeavePolicy_dto_1 = require("./dto/UpdateLeavePolicy.dto");
const CreateLeaveRequest_dto_1 = require("./dto/CreateLeaveRequest.dto");
const UpdateLeaveRequest_dto_1 = require("./dto/UpdateLeaveRequest.dto");
const CreateLeaveEntitlement_dto_1 = require("./dto/CreateLeaveEntitlement.dto");
const UpdateLeaveEntitlement_dto_1 = require("./dto/UpdateLeaveEntitlement.dto");
const CreateLeaveAdjustment_dto_1 = require("./dto/CreateLeaveAdjustment.dto");
const CreateLeaveType_dto_1 = require("./dto/CreateLeaveType.dto");
const UpdateLeaveType_dto_1 = require("./dto/UpdateLeaveType.dto");
const CreateLeaveCategory_dto_1 = require("./dto/CreateLeaveCategory.dto");
const ApproveLeaveRequest_dto_1 = require("./dto/ApproveLeaveRequest.dto");
const RejectLeaveRequest_dto_1 = require("./dto/RejectLeaveRequest.dto");
const FinalizeLeaveRequest_dto_1 = require("./dto/FinalizeLeaveRequest.dto");
const HrOverrideDecision_dto_1 = require("./dto/HrOverrideDecision.dto");
const ProcessMultipleRequests_dto_1 = require("./dto/ProcessMultipleRequests.dto");
const FilterLeaveHistory_dto_1 = require("./dto/FilterLeaveHistory.dto");
const FilterTeamLeaveData_dto_1 = require("./dto/FilterTeamLeaveData.dto");
const FlagIrregularPattern_dto_1 = require("./dto/FlagIrregularPattern.dto");
const AutoAccrueLeave_dto_1 = require("./dto/AutoAccrueLeave.dto");
const CarryForward_dto_1 = require("./dto/CarryForward.dto");
const AccrualAdjustment_dto_1 = require("./dto/AccrualAdjustment.dto");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const roles_guard_1 = require("../common/guards/roles.guard");
const employee_profile_enums_1 = require("../employee-profile/enums/employee-profile.enums");
const CalculateAccrual_Dto_1 = require("./dto/CalculateAccrual.Dto");
let LeaveController = class LeaveController {
    async createCalendar(dto) {
        return await this.leavesService.createCalendar(dto);
    }
    async getCalendar(year) {
        return await this.leavesService.getCalendarByYear(Number(year));
    }
    async updateCalendar(year, dto) {
        return await this.leavesService.updateCalendar(Number(year), dto);
    }
    constructor(leavesService) {
        this.leavesService = leavesService;
    }
    async createLeavePolicy(createLeavePolicyDto) {
        return await this.leavesService.createLeavePolicy(createLeavePolicyDto);
    }
    async getLeavePolicies() {
        return await this.leavesService.getLeavePolicies();
    }
    async getLeavePolicyById(id) {
        return await this.leavesService.getLeavePolicyById(id);
    }
    async updateLeavePolicy(id, updateLeavePolicyDto) {
        return await this.leavesService.updateLeavePolicy(id, updateLeavePolicyDto);
    }
    async deleteLeavePolicy(id) {
        return await this.leavesService.deleteLeavePolicy(id);
    }
    async createLeaveRequest(createLeaveRequestDto) {
        return await this.leavesService.createLeaveRequest(createLeaveRequestDto);
    }
    async getLeaveRequestById(id) {
        return await this.leavesService.getLeaveRequestById(id);
    }
    async updateLeaveRequest(id, updateLeaveRequestDto) {
        return await this.leavesService.updateLeaveRequest(id, updateLeaveRequestDto);
    }
    async deleteLeaveRequest(id) {
        return await this.leavesService.deleteLeaveRequest(id);
    }
    async createLeaveEntitlement(createLeaveEntitlementDto) {
        return await this.leavesService.createLeaveEntitlement(createLeaveEntitlementDto);
    }
    async getLeaveEntitlement(employeeId, leaveTypeId) {
        return await this.leavesService.getLeaveEntitlement(employeeId, leaveTypeId);
    }
    async updateLeaveEntitlement(id, updateLeaveEntitlementDto) {
        return await this.leavesService.updateLeaveEntitlement(id, updateLeaveEntitlementDto);
    }
    async createLeaveAdjustment(createLeaveAdjustmentDto) {
        return await this.leavesService.createLeaveAdjustment(createLeaveAdjustmentDto);
    }
    async getLeaveAdjustments(employeeId) {
        return await this.leavesService.getLeaveAdjustments(employeeId);
    }
    async deleteLeaveAdjustment(id) {
        return await this.leavesService.deleteLeaveAdjustment(id);
    }
    async createLeaveCategory(createLeaveCategoryDto) {
        return await this.leavesService.createLeaveCategory(createLeaveCategoryDto);
    }
    async createLeaveType(createLeaveTypeDto) {
        return await this.leavesService.createLeaveType(createLeaveTypeDto);
    }
    async updateLeaveType(id, updateLeaveTypeDto) {
        return await this.leavesService.updateLeaveType(id, updateLeaveTypeDto);
    }
    async approveLeaveRequest(id, approveLeaveRequestDto, req) {
        return await this.leavesService.approveLeaveRequest(approveLeaveRequestDto, req.user);
    }
    async rejectLeaveRequest(id, rejectLeaveRequestDto, req) {
        return await this.leavesService.rejectLeaveRequest(rejectLeaveRequestDto, req.user);
    }
    async finalizeLeaveRequest(finalizeDto) {
        return await this.leavesService.finalizeLeaveRequest(finalizeDto.leaveRequestId, finalizeDto.hrUserId);
    }
    async hrOverrideDecision(overrideDto) {
        return await this.leavesService.hrOverrideDecision(overrideDto.leaveRequestId, overrideDto.hrUserId, overrideDto.overrideToApproved, overrideDto.overrideReason);
    }
    async processMultipleLeaveRequests(processDto) {
        return await this.leavesService.processMultipleLeaveRequests(processDto.leaveRequestIds, processDto.hrUserId, processDto.approved);
    }
    async getEmployeeLeaveBalance(employeeId, leaveTypeId) {
        return await this.leavesService.getEmployeeLeaveBalance(employeeId, leaveTypeId);
    }
    async cancelLeaveRequest(id) {
        return await this.leavesService.cancelLeaveRequest(id);
    }
    async getLeaveBalanceDetails(employeeId, leaveTypeId) {
        return await this.leavesService.getEmployeeLeaveBalance(employeeId, leaveTypeId);
    }
    async getPastLeaveRequests(employeeId, fromDate, toDate, status, leaveTypeId) {
        return await this.leavesService.getPastLeaveRequests(employeeId, {
            fromDate: fromDate ? new Date(fromDate) : undefined,
            toDate: toDate ? new Date(toDate) : undefined,
            status,
            leaveTypeId,
        });
    }
    async filterLeaveHistory(filterDto) {
        return await this.leavesService.filterLeaveHistory(filterDto.employeeId, filterDto);
    }
    async getTeamLeaveBalances(managerId, upcomingFromDate, upcomingToDate, departmentId) {
        return await this.leavesService.getTeamLeaveBalances(managerId, upcomingFromDate ? new Date(upcomingFromDate) : undefined, upcomingToDate ? new Date(upcomingToDate) : undefined, departmentId);
    }
    async filterTeamLeaveData(filterDto) {
        return await this.leavesService.filterTeamLeaveData(filterDto.managerId, filterDto);
    }
    async flagIrregularPattern(flagDto) {
        return await this.leavesService.flagIrregularPattern(flagDto.leaveRequestId, flagDto.managerId, flagDto.flagReason, flagDto.notes);
    }
    async autoAccrueLeave(accrueDto) {
        return await this.leavesService.autoAccrueLeave(accrueDto.employeeId, accrueDto.leaveTypeId, accrueDto.accrualAmount, accrueDto.accrualType, accrueDto.policyId, accrueDto.notes);
    }
    async autoAccrueAllEmployees(accrueAllDto) {
        return await this.leavesService.autoAccrueAllEmployees(accrueAllDto.leaveTypeId, accrueAllDto.accrualAmount, accrueAllDto.accrualType, accrueAllDto.departmentId);
    }
    async runCarryForward(carryForwardDto) {
        return await this.leavesService.runCarryForward(carryForwardDto.leaveTypeId, carryForwardDto.employeeId, carryForwardDto.asOfDate, carryForwardDto.departmentId);
    }
    async adjustAccrual(adjustmentDto) {
        return await this.leavesService.adjustAccrual(adjustmentDto.employeeId, adjustmentDto.leaveTypeId, adjustmentDto.adjustmentType, adjustmentDto.adjustmentAmount, adjustmentDto.fromDate, adjustmentDto.toDate, adjustmentDto.reason, adjustmentDto.notes);
    }
    async calculateAccrual(calculateAccrualDto) {
        const { employeeId, leaveTypeId, accrualMethod } = calculateAccrualDto;
        await this.leavesService.calculateAccrual(employeeId, leaveTypeId, accrualMethod);
    }
    async assignPersonalizedEntitlement(employeeId, leaveTypeId, personalizedEntitlement) {
        return await this.leavesService.assignPersonalizedEntitlement(employeeId, leaveTypeId, personalizedEntitlement);
    }
};
exports.LeaveController = LeaveController;
__decorate([
    (0, common_1.Post)('calendar'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateCalendar_dto_1.CreateCalendarDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "createCalendar", null);
__decorate([
    (0, common_1.Get)('calendar/:year'),
    __param(0, (0, common_1.Param)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "getCalendar", null);
__decorate([
    (0, common_1.Put)('calendar/:year'),
    __param(0, (0, common_1.Param)('year')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateCalendar_dto_1.CreateCalendarDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "updateCalendar", null);
__decorate([
    (0, common_1.Post)('policy'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.LEGAL_POLICY_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateLeavePolicy_dto_1.CreateLeavePolicyDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "createLeavePolicy", null);
__decorate([
    (0, common_1.Get)('policies'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_EMPLOYEE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "getLeavePolicies", null);
__decorate([
    (0, common_1.Get)('policy/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_EMPLOYEE),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "getLeavePolicyById", null);
__decorate([
    (0, common_1.Put)('policy/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.LEGAL_POLICY_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateLeavePolicy_dto_1.UpdateLeavePolicyDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "updateLeavePolicy", null);
__decorate([
    (0, common_1.Delete)('policy/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.LEGAL_POLICY_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "deleteLeavePolicy", null);
__decorate([
    (0, common_1.Post)('request'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateLeaveRequest_dto_1.CreateLeaveRequestDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "createLeaveRequest", null);
__decorate([
    (0, common_1.Get)('request/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_MANAGER),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "getLeaveRequestById", null);
__decorate([
    (0, common_1.Put)('request/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateLeaveRequest_dto_1.UpdateLeaveRequestDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "updateLeaveRequest", null);
__decorate([
    (0, common_1.Delete)('request/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "deleteLeaveRequest", null);
__decorate([
    (0, common_1.Post)('entitlement'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateLeaveEntitlement_dto_1.CreateLeaveEntitlementDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "createLeaveEntitlement", null);
__decorate([
    (0, common_1.Get)('entitlement/:employeeId/:leaveTypeId'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Param)('leaveTypeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "getLeaveEntitlement", null);
__decorate([
    (0, common_1.Put)('entitlement/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateLeaveEntitlement_dto_1.UpdateLeaveEntitlementDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "updateLeaveEntitlement", null);
__decorate([
    (0, common_1.Post)('adjustment'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateLeaveAdjustment_dto_1.CreateLeaveAdjustmentDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "createLeaveAdjustment", null);
__decorate([
    (0, common_1.Get)('adjustment/:employeeId'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "getLeaveAdjustments", null);
__decorate([
    (0, common_1.Delete)('adjustment/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "deleteLeaveAdjustment", null);
__decorate([
    (0, common_1.Post)('category'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.LEGAL_POLICY_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateLeaveCategory_dto_1.CreateLeaveCategoryDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "createLeaveCategory", null);
__decorate([
    (0, common_1.Post)('type'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.LEGAL_POLICY_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateLeaveType_dto_1.CreateLeaveTypeDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "createLeaveType", null);
__decorate([
    (0, common_1.Put)('type/:id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.LEGAL_POLICY_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateLeaveType_dto_1.UpdateLeaveTypeDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "updateLeaveType", null);
__decorate([
    (0, common_1.Post)('request/:id/approve'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ApproveLeaveRequest_dto_1.ApproveLeaveRequestDto, Object]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "approveLeaveRequest", null);
__decorate([
    (0, common_1.Post)('request/:id/reject'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, RejectLeaveRequest_dto_1.RejectLeaveRequestDto, Object]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "rejectLeaveRequest", null);
__decorate([
    (0, common_1.Post)('request/finalize'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [FinalizeLeaveRequest_dto_1.FinalizeLeaveRequestDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "finalizeLeaveRequest", null);
__decorate([
    (0, common_1.Post)('request/override'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [HrOverrideDecision_dto_1.HrOverrideDecisionDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "hrOverrideDecision", null);
__decorate([
    (0, common_1.Post)('request/process-multiple'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ProcessMultipleRequests_dto_1.ProcessMultipleRequestsDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "processMultipleLeaveRequests", null);
__decorate([
    (0, common_1.Get)('balance/:employeeId'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Query)('leaveTypeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "getEmployeeLeaveBalance", null);
__decorate([
    (0, common_1.Post)('request/:id/cancel'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE, employee_profile_enums_1.SystemRole.HR_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "cancelLeaveRequest", null);
__decorate([
    (0, common_1.Get)('balance-details/:employeeId'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Query)('leaveTypeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "getLeaveBalanceDetails", null);
__decorate([
    (0, common_1.Get)('past-requests/:employeeId'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Query)('fromDate')),
    __param(2, (0, common_1.Query)('toDate')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('leaveTypeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "getPastLeaveRequests", null);
__decorate([
    (0, common_1.Post)('filter-history'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_EMPLOYEE, employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [FilterLeaveHistory_dto_1.FilterLeaveHistoryDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "filterLeaveHistory", null);
__decorate([
    (0, common_1.Get)('team-balances/:managerId'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN),
    __param(0, (0, common_1.Param)('managerId')),
    __param(1, (0, common_1.Query)('upcomingFromDate')),
    __param(2, (0, common_1.Query)('upcomingToDate')),
    __param(3, (0, common_1.Query)('departmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "getTeamLeaveBalances", null);
__decorate([
    (0, common_1.Post)('filter-team-data'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [FilterTeamLeaveData_dto_1.FilterTeamLeaveDataDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "filterTeamLeaveData", null);
__decorate([
    (0, common_1.Post)('flag-irregular-pattern'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.DEPARTMENT_HEAD, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.HR_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [FlagIrregularPattern_dto_1.FlagIrregularPatternDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "flagIrregularPattern", null);
__decorate([
    (0, common_1.Post)('auto-accrue'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AutoAccrueLeave_dto_1.AutoAccrueLeaveDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "autoAccrueLeave", null);
__decorate([
    (0, common_1.Post)('auto-accrue-all'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AutoAccrueLeave_dto_1.AccrueAllEmployeesDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "autoAccrueAllEmployees", null);
__decorate([
    (0, common_1.Post)('carry-forward'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CarryForward_dto_1.RunCarryForwardDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "runCarryForward", null);
__decorate([
    (0, common_1.Post)('adjust-accrual'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(employee_profile_enums_1.SystemRole.HR_ADMIN, employee_profile_enums_1.SystemRole.HR_MANAGER, employee_profile_enums_1.SystemRole.PAYROLL_SPECIALIST),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AccrualAdjustment_dto_1.AccrualAdjustmentDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "adjustAccrual", null);
__decorate([
    (0, common_1.Post)('calculate-accrual'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CalculateAccrual_Dto_1.CalculateAccrualDto]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "calculateAccrual", null);
__decorate([
    (0, common_1.Post)('entitlement/:employeeId/:leaveTypeId/personalized'),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Param)('leaveTypeId')),
    __param(2, (0, common_1.Body)('personalizedEntitlement')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number]),
    __metadata("design:returntype", Promise)
], LeaveController.prototype, "assignPersonalizedEntitlement", null);
exports.LeaveController = LeaveController = __decorate([
    (0, common_1.Controller)('leaves'),
    __metadata("design:paramtypes", [leaves_service_1.LeavesService])
], LeaveController);
//# sourceMappingURL=leaves.controller.js.map