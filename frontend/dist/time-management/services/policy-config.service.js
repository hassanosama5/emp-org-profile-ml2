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
exports.PolicyConfigService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const overtime_rule_schema_1 = require("../models/overtime-rule.schema");
const lateness_rule_schema_1 = require("../models/lateness-rule.schema");
const holiday_schema_1 = require("../models/holiday.schema");
let PolicyConfigService = class PolicyConfigService {
    constructor(overtimeRuleModel, latenessRuleModel, holidayModel) {
        this.overtimeRuleModel = overtimeRuleModel;
        this.latenessRuleModel = latenessRuleModel;
        this.holidayModel = holidayModel;
    }
    async createOvertimeRule(createOvertimeRuleDto, currentUserId) {
        const newOvertimeRule = new this.overtimeRuleModel({
            ...createOvertimeRuleDto,
            createdBy: currentUserId,
            updatedBy: currentUserId,
        });
        return newOvertimeRule.save();
    }
    async getOvertimeRules(getPoliciesDto, currentUserId) {
        const query = {};
        if (getPoliciesDto.active !== undefined) {
            query.active = getPoliciesDto.active;
        }
        if (getPoliciesDto.approved !== undefined) {
            query.approved = getPoliciesDto.approved;
        }
        return this.overtimeRuleModel.find(query).exec();
    }
    async getOvertimeRuleById(id, currentUserId) {
        return this.overtimeRuleModel.findById(id).exec();
    }
    async updateOvertimeRule(id, updateOvertimeRuleDto, currentUserId) {
        return this.overtimeRuleModel
            .findByIdAndUpdate(id, {
            ...updateOvertimeRuleDto,
            updatedBy: currentUserId,
        }, { new: true })
            .exec();
    }
    async deleteOvertimeRule(id, currentUserId) {
        return this.overtimeRuleModel.findByIdAndDelete(id).exec();
    }
    async createLatenessRule(createLatenessRuleDto, currentUserId) {
        const newLatenessRule = new this.latenessRuleModel({
            ...createLatenessRuleDto,
            createdBy: currentUserId,
            updatedBy: currentUserId,
        });
        return newLatenessRule.save();
    }
    async getLatenessRules(getPoliciesDto, currentUserId) {
        const query = {};
        if (getPoliciesDto.active !== undefined) {
            query.active = getPoliciesDto.active;
        }
        return this.latenessRuleModel.find(query).exec();
    }
    async getLatenessRuleById(id, currentUserId) {
        return this.latenessRuleModel.findById(id).exec();
    }
    async updateLatenessRule(id, updateLatenessRuleDto, currentUserId) {
        return this.latenessRuleModel
            .findByIdAndUpdate(id, {
            ...updateLatenessRuleDto,
            updatedBy: currentUserId,
        }, { new: true })
            .exec();
    }
    async deleteLatenessRule(id, currentUserId) {
        return this.latenessRuleModel.findByIdAndDelete(id).exec();
    }
    async createHoliday(createHolidayDto, currentUserId) {
        const newHoliday = new this.holidayModel({
            ...createHolidayDto,
            createdBy: currentUserId,
            updatedBy: currentUserId,
        });
        return newHoliday.save();
    }
    async getHolidays(getHolidaysDto, currentUserId) {
        const query = {};
        if (getHolidaysDto.type) {
            query.type = getHolidaysDto.type;
        }
        if (getHolidaysDto.active !== undefined) {
            query.active = getHolidaysDto.active;
        }
        if (getHolidaysDto.startDate && getHolidaysDto.endDate) {
            query.$or = [
                {
                    startDate: {
                        $gte: getHolidaysDto.startDate,
                        $lte: getHolidaysDto.endDate,
                    },
                },
                {
                    endDate: {
                        $gte: getHolidaysDto.startDate,
                        $lte: getHolidaysDto.endDate,
                    },
                },
                {
                    $and: [
                        { startDate: { $lte: getHolidaysDto.startDate } },
                        { endDate: { $gte: getHolidaysDto.endDate } },
                    ],
                },
            ];
        }
        return this.holidayModel.find(query).sort({ startDate: 1 }).exec();
    }
    async getHolidayById(id, currentUserId) {
        return this.holidayModel.findById(id).exec();
    }
    async updateHoliday(id, updateHolidayDto, currentUserId) {
        return this.holidayModel
            .findByIdAndUpdate(id, {
            ...updateHolidayDto,
            updatedBy: currentUserId,
        }, { new: true })
            .exec();
    }
    async deleteHoliday(id, currentUserId) {
        return this.holidayModel.findByIdAndDelete(id).exec();
    }
    async checkHoliday(checkHolidayDto, currentUserId) {
        const date = new Date(checkHolidayDto.date);
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        const holiday = await this.holidayModel
            .findOne({
            active: true,
            $or: [
                {
                    startDate: { $gte: date, $lt: nextDay },
                    endDate: { $exists: false },
                },
                {
                    startDate: { $lte: date },
                    endDate: { $gte: date },
                },
                {
                    startDate: { $gte: date, $lt: nextDay },
                    endDate: { $gte: date, $lt: nextDay },
                },
            ],
        })
            .exec();
        return {
            isHoliday: !!holiday,
            holiday: holiday || null,
        };
    }
    async validateAttendanceHoliday(validateAttendanceHolidayDto, currentUserId) {
        const { employeeId, date, suppressPenalty } = validateAttendanceHolidayDto;
        const holidayCheck = await this.checkHoliday({ date }, currentUserId);
        if (holidayCheck.isHoliday && suppressPenalty) {
            return {
                employeeId,
                date,
                isHoliday: true,
                holidayName: holidayCheck.holiday?.name || 'Holiday',
                holidayType: holidayCheck.holiday?.type,
                penaltySuppressed: true,
                message: 'Attendance penalty suppressed due to holiday',
            };
        }
        return {
            employeeId,
            date,
            isHoliday: holidayCheck.isHoliday,
            holidayName: holidayCheck.holiday?.name || null,
            holidayType: holidayCheck.holiday?.type || null,
            penaltySuppressed: false,
            message: holidayCheck.isHoliday
                ? 'Date is a holiday but penalty suppression not requested'
                : 'Date is not a holiday',
        };
    }
    async getUpcomingHolidays(days = 30, currentUserId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const futureDate = new Date(today);
        futureDate.setDate(futureDate.getDate() + days);
        return this.holidayModel
            .find({
            active: true,
            startDate: { $gte: today, $lte: futureDate },
        })
            .sort({ startDate: 1 })
            .exec();
    }
};
exports.PolicyConfigService = PolicyConfigService;
exports.PolicyConfigService = PolicyConfigService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(overtime_rule_schema_1.OvertimeRule.name)),
    __param(1, (0, mongoose_1.InjectModel)(lateness_rule_schema_1.LatenessRule.name)),
    __param(2, (0, mongoose_1.InjectModel)(holiday_schema_1.Holiday.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], PolicyConfigService);
//# sourceMappingURL=policy-config.service.js.map