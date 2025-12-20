import { Model } from 'mongoose';
import { OvertimeRule } from '../models/overtime-rule.schema';
import { LatenessRule } from '../models/lateness-rule.schema';
import { Holiday } from '../models/holiday.schema';
import { CreateOvertimeRuleDto, UpdateOvertimeRuleDto, CreateLatenessRuleDto, UpdateLatenessRuleDto, CreateHolidayDto, UpdateHolidayDto, GetHolidaysDto, GetPoliciesDto, CheckHolidayDto, ValidateAttendanceHolidayDto } from '../DTOs/policy-config.dtos';
export declare class PolicyConfigService {
    private overtimeRuleModel;
    private latenessRuleModel;
    private holidayModel;
    constructor(overtimeRuleModel: Model<OvertimeRule>, latenessRuleModel: Model<LatenessRule>, holidayModel: Model<Holiday>);
    createOvertimeRule(createOvertimeRuleDto: CreateOvertimeRuleDto, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, OvertimeRule, {}, {}> & OvertimeRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getOvertimeRules(getPoliciesDto: GetPoliciesDto, currentUserId: string): Promise<(import("mongoose").Document<unknown, {}, OvertimeRule, {}, {}> & OvertimeRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getOvertimeRuleById(id: string, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, OvertimeRule, {}, {}> & OvertimeRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateOvertimeRule(id: string, updateOvertimeRuleDto: UpdateOvertimeRuleDto, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, OvertimeRule, {}, {}> & OvertimeRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    deleteOvertimeRule(id: string, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, OvertimeRule, {}, {}> & OvertimeRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    createLatenessRule(createLatenessRuleDto: CreateLatenessRuleDto, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, LatenessRule, {}, {}> & LatenessRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getLatenessRules(getPoliciesDto: GetPoliciesDto, currentUserId: string): Promise<(import("mongoose").Document<unknown, {}, LatenessRule, {}, {}> & LatenessRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getLatenessRuleById(id: string, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, LatenessRule, {}, {}> & LatenessRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateLatenessRule(id: string, updateLatenessRuleDto: UpdateLatenessRuleDto, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, LatenessRule, {}, {}> & LatenessRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    deleteLatenessRule(id: string, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, LatenessRule, {}, {}> & LatenessRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    createHoliday(createHolidayDto: CreateHolidayDto, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, Holiday, {}, {}> & Holiday & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getHolidays(getHolidaysDto: GetHolidaysDto, currentUserId: string): Promise<(import("mongoose").Document<unknown, {}, Holiday, {}, {}> & Holiday & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getHolidayById(id: string, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, Holiday, {}, {}> & Holiday & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateHoliday(id: string, updateHolidayDto: UpdateHolidayDto, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, Holiday, {}, {}> & Holiday & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    deleteHoliday(id: string, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, Holiday, {}, {}> & Holiday & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    checkHoliday(checkHolidayDto: CheckHolidayDto, currentUserId: string): Promise<{
        isHoliday: boolean;
        holiday: import("mongoose").Document<unknown, {}, Holiday, {}, {}> & Holiday & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        };
    }>;
    validateAttendanceHoliday(validateAttendanceHolidayDto: ValidateAttendanceHolidayDto, currentUserId: string): Promise<{
        employeeId: string;
        date: Date;
        isHoliday: boolean;
        holidayName: string;
        holidayType: import("../models/enums").HolidayType;
        penaltySuppressed: boolean;
        message: string;
    }>;
    getUpcomingHolidays(days: number, currentUserId: string): Promise<(import("mongoose").Document<unknown, {}, Holiday, {}, {}> & Holiday & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
}
