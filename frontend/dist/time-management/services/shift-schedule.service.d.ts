import { Model } from 'mongoose';
import { ShiftType } from '../models/shift-type.schema';
import { Shift } from '../models/shift.schema';
import { ShiftAssignment } from '../models/shift-assignment.schema';
import { ScheduleRule } from '../models/schedule-rule.schema';
export declare class ShiftScheduleService {
    private shiftTypeModel;
    private shiftModel;
    private shiftAssignmentModel;
    private scheduleRuleModel;
    constructor(shiftTypeModel: Model<ShiftType>, shiftModel: Model<Shift>, shiftAssignmentModel: Model<ShiftAssignment>, scheduleRuleModel: Model<ScheduleRule>);
    createShiftType(createShiftTypeDto: any, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, ShiftType, {}, {}> & ShiftType & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    createShift(createShiftDto: any, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, Shift, {}, {}> & Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateShift(id: string, updateShiftDto: any, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, Shift, {}, {}> & Shift & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    assignShiftToEmployee(assignShiftToEmployeeDto: any, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, ShiftAssignment, {}, {}> & ShiftAssignment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    createScheduleRule(createScheduleRuleDto: any, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, ScheduleRule, {}, {}> & ScheduleRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    defineFlexibleSchedulingRules(defineFlexibleSchedulingRulesDto: any, currentUserId: string): Promise<import("mongoose").Document<unknown, {}, ScheduleRule, {}, {}> & ScheduleRule & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
}
