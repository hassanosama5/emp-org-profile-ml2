import { ShiftScheduleService } from '../services/shift-schedule.service';
import { CreateShiftTypeDto, CreateShiftDto, AssignShiftToEmployeeDto, UpdateShiftDto, CreateScheduleRuleDto, DefineFlexibleSchedulingRulesDto } from '../DTOs/shift.dtos';
export declare class ShiftAndScheduleController {
    private readonly shiftScheduleService;
    constructor(shiftScheduleService: ShiftScheduleService);
    createShiftType(createShiftTypeDto: CreateShiftTypeDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/shift-type.schema").ShiftType, {}, {}> & import("../models/shift-type.schema").ShiftType & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    createShift(createShiftDto: CreateShiftDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/shift.schema").Shift, {}, {}> & import("../models/shift.schema").Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateShift(id: string, updateShiftDto: UpdateShiftDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/shift.schema").Shift, {}, {}> & import("../models/shift.schema").Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    assignShiftToEmployee(assignShiftToEmployeeDto: AssignShiftToEmployeeDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/shift-assignment.schema").ShiftAssignment, {}, {}> & import("../models/shift-assignment.schema").ShiftAssignment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    createScheduleRule(createScheduleRuleDto: CreateScheduleRuleDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/schedule-rule.schema").ScheduleRule, {}, {}> & import("../models/schedule-rule.schema").ScheduleRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    defineFlexibleSchedulingRules(defineFlexibleSchedulingRulesDto: DefineFlexibleSchedulingRulesDto, user: any): Promise<import("mongoose").Document<unknown, {}, import("../models/schedule-rule.schema").ScheduleRule, {}, {}> & import("../models/schedule-rule.schema").ScheduleRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
}
