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
exports.ShiftScheduleService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const shift_type_schema_1 = require("../models/shift-type.schema");
const shift_schema_1 = require("../models/shift.schema");
const shift_assignment_schema_1 = require("../models/shift-assignment.schema");
const schedule_rule_schema_1 = require("../models/schedule-rule.schema");
let ShiftScheduleService = class ShiftScheduleService {
    constructor(shiftTypeModel, shiftModel, shiftAssignmentModel, scheduleRuleModel) {
        this.shiftTypeModel = shiftTypeModel;
        this.shiftModel = shiftModel;
        this.shiftAssignmentModel = shiftAssignmentModel;
        this.scheduleRuleModel = scheduleRuleModel;
    }
    async createShiftType(createShiftTypeDto, currentUserId) {
        const newShiftType = new this.shiftTypeModel({
            ...createShiftTypeDto,
            createdBy: currentUserId,
            updatedBy: currentUserId,
        });
        return newShiftType.save();
    }
    async createShift(createShiftDto, currentUserId) {
        const newShift = new this.shiftModel({
            ...createShiftDto,
            createdBy: currentUserId,
            updatedBy: currentUserId,
        });
        return newShift.save();
    }
    async updateShift(id, updateShiftDto, currentUserId) {
        return this.shiftModel.findByIdAndUpdate(id, {
            ...updateShiftDto,
            updatedBy: currentUserId,
        }, { new: true });
    }
    async assignShiftToEmployee(assignShiftToEmployeeDto, currentUserId) {
        const newShiftAssignment = new this.shiftAssignmentModel({
            ...assignShiftToEmployeeDto,
            createdBy: currentUserId,
            updatedBy: currentUserId,
        });
        return newShiftAssignment.save();
    }
    async createScheduleRule(createScheduleRuleDto, currentUserId) {
        const newScheduleRule = new this.scheduleRuleModel({
            ...createScheduleRuleDto,
            createdBy: currentUserId,
            updatedBy: currentUserId,
        });
        return newScheduleRule.save();
    }
    async defineFlexibleSchedulingRules(defineFlexibleSchedulingRulesDto, currentUserId) {
        const newFlexibleSchedule = new this.scheduleRuleModel({
            ...defineFlexibleSchedulingRulesDto,
            createdBy: currentUserId,
            updatedBy: currentUserId,
        });
        return newFlexibleSchedule.save();
    }
};
exports.ShiftScheduleService = ShiftScheduleService;
exports.ShiftScheduleService = ShiftScheduleService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(shift_type_schema_1.ShiftType.name)),
    __param(1, (0, mongoose_1.InjectModel)(shift_schema_1.Shift.name)),
    __param(2, (0, mongoose_1.InjectModel)(shift_assignment_schema_1.ShiftAssignment.name)),
    __param(3, (0, mongoose_1.InjectModel)(schedule_rule_schema_1.ScheduleRule.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], ShiftScheduleService);
//# sourceMappingURL=shift-schedule.service.js.map