import { PolicyConfigService } from '../services/policy-config.service';
import { CreateOvertimeRuleDto, UpdateOvertimeRuleDto, CreateLatenessRuleDto, UpdateLatenessRuleDto, CreateHolidayDto, UpdateHolidayDto, GetHolidaysDto, GetPoliciesDto, CheckHolidayDto, ValidateAttendanceHolidayDto } from '../DTOs/policy-config.dtos';
export declare class PolicyConfigController {
    private readonly policyConfigService;
    constructor(policyConfigService: PolicyConfigService);
    createOvertimeRule(createOvertimeRuleDto: CreateOvertimeRuleDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/overtime-rule.schema").OvertimeRule, {}, {}> & import("../models/overtime-rule.schema").OvertimeRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getOvertimeRules(getPoliciesDto: GetPoliciesDto, user: any): Promise<(import("mongoose").Document<unknown, {}, import("../models/overtime-rule.schema").OvertimeRule, {}, {}> & import("../models/overtime-rule.schema").OvertimeRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getOvertimeRuleById(id: string, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/overtime-rule.schema").OvertimeRule, {}, {}> & import("../models/overtime-rule.schema").OvertimeRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateOvertimeRule(id: string, updateOvertimeRuleDto: UpdateOvertimeRuleDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/overtime-rule.schema").OvertimeRule, {}, {}> & import("../models/overtime-rule.schema").OvertimeRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    deleteOvertimeRule(id: string, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/overtime-rule.schema").OvertimeRule, {}, {}> & import("../models/overtime-rule.schema").OvertimeRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    createLatenessRule(createLatenessRuleDto: CreateLatenessRuleDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/lateness-rule.schema").LatenessRule, {}, {}> & import("../models/lateness-rule.schema").LatenessRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getLatenessRules(getPoliciesDto: GetPoliciesDto, user: any): Promise<(import("mongoose").Document<unknown, {}, import("../models/lateness-rule.schema").LatenessRule, {}, {}> & import("../models/lateness-rule.schema").LatenessRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getLatenessRuleById(id: string, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/lateness-rule.schema").LatenessRule, {}, {}> & import("../models/lateness-rule.schema").LatenessRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateLatenessRule(id: string, updateLatenessRuleDto: UpdateLatenessRuleDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/lateness-rule.schema").LatenessRule, {}, {}> & import("../models/lateness-rule.schema").LatenessRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    deleteLatenessRule(id: string, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/lateness-rule.schema").LatenessRule, {}, {}> & import("../models/lateness-rule.schema").LatenessRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    createHoliday(createHolidayDto: CreateHolidayDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/holiday.schema").Holiday, {}, {}> & import("../models/holiday.schema").Holiday & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getHolidays(getHolidaysDto: GetHolidaysDto, user: any): Promise<(import("mongoose").Document<unknown, {}, import("../models/holiday.schema").Holiday, {}, {}> & import("../models/holiday.schema").Holiday & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getUpcomingHolidays(days?: number, user?: any): Promise<(import("mongoose").Document<unknown, {}, import("../models/holiday.schema").Holiday, {}, {}> & import("../models/holiday.schema").Holiday & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getHolidayById(id: string, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/holiday.schema").Holiday, {}, {}> & import("../models/holiday.schema").Holiday & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateHoliday(id: string, updateHolidayDto: UpdateHolidayDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/holiday.schema").Holiday, {}, {}> & import("../models/holiday.schema").Holiday & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    deleteHoliday(id: string, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/holiday.schema").Holiday, {}, {}> & import("../models/holiday.schema").Holiday & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    checkHoliday(checkHolidayDto: CheckHolidayDto, user: any): Promise<{
        isHoliday: boolean;
        holiday: import("mongoose").Document<unknown, {}, import("../models/holiday.schema").Holiday, {}, {}> & import("../models/holiday.schema").Holiday & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        };
    }>;
    validateAttendanceHoliday(validateAttendanceHolidayDto: ValidateAttendanceHolidayDto, user: any): Promise<{
        employeeId: string;
        date: Date;
        isHoliday: boolean;
        holidayName: string;
        holidayType: import("../models/enums").HolidayType;
        penaltySuppressed: boolean;
        message: string;
    }>;
}
