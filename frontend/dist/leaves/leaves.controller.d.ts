import { CreateCalendarDto } from './dto/CreateCalendar.dto';
import { LeavesService } from './leaves.service';
import { CreateLeavePolicyDto } from './dto/CreateLeavePolicy.dto';
import { UpdateLeavePolicyDto } from './dto/UpdateLeavePolicy.dto';
import { CreateLeaveRequestDto } from './dto/CreateLeaveRequest.dto';
import { UpdateLeaveRequestDto } from './dto/UpdateLeaveRequest.dto';
import { CreateLeaveEntitlementDto } from './dto/CreateLeaveEntitlement.dto';
import { UpdateLeaveEntitlementDto } from './dto/UpdateLeaveEntitlement.dto';
import { CreateLeaveAdjustmentDto } from './dto/CreateLeaveAdjustment.dto';
import { CreateLeaveTypeDto } from './dto/CreateLeaveType.dto';
import { UpdateLeaveTypeDto } from './dto/UpdateLeaveType.dto';
import { CreateLeaveCategoryDto } from './dto/CreateLeaveCategory.dto';
import { ApproveLeaveRequestDto } from './dto/ApproveLeaveRequest.dto';
import { RejectLeaveRequestDto } from './dto/RejectLeaveRequest.dto';
import { FinalizeLeaveRequestDto } from './dto/FinalizeLeaveRequest.dto';
import { HrOverrideDecisionDto } from './dto/HrOverrideDecision.dto';
import { ProcessMultipleRequestsDto } from './dto/ProcessMultipleRequests.dto';
import { FilterLeaveHistoryDto } from './dto/FilterLeaveHistory.dto';
import { FilterTeamLeaveDataDto } from './dto/FilterTeamLeaveData.dto';
import { FlagIrregularPatternDto } from './dto/FlagIrregularPattern.dto';
import { AutoAccrueLeaveDto, AccrueAllEmployeesDto } from './dto/AutoAccrueLeave.dto';
import { RunCarryForwardDto } from './dto/CarryForward.dto';
import { AccrualAdjustmentDto } from './dto/AccrualAdjustment.dto';
import { CalculateAccrualDto } from './dto/CalculateAccrual.Dto';
export declare class LeaveController {
    private readonly leavesService;
    createCalendar(dto: CreateCalendarDto): Promise<import("mongoose").Document<unknown, {}, import("./models/calendar.schema").Calendar, {}, {}> & import("./models/calendar.schema").Calendar & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getCalendar(year: string): Promise<import("mongoose").Document<unknown, {}, import("./models/calendar.schema").Calendar, {}, {}> & import("./models/calendar.schema").Calendar & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateCalendar(year: string, dto: CreateCalendarDto): Promise<import("mongoose").Document<unknown, {}, import("./models/calendar.schema").Calendar, {}, {}> & import("./models/calendar.schema").Calendar & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    constructor(leavesService: LeavesService);
    createLeavePolicy(createLeavePolicyDto: CreateLeavePolicyDto): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-policy.schema").LeavePolicy, {}, {}> & import("./models/leave-policy.schema").LeavePolicy & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getLeavePolicies(): Promise<(import("mongoose").Document<unknown, {}, import("./models/leave-policy.schema").LeavePolicy, {}, {}> & import("./models/leave-policy.schema").LeavePolicy & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getLeavePolicyById(id: string): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-policy.schema").LeavePolicy, {}, {}> & import("./models/leave-policy.schema").LeavePolicy & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateLeavePolicy(id: string, updateLeavePolicyDto: UpdateLeavePolicyDto): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-policy.schema").LeavePolicy, {}, {}> & import("./models/leave-policy.schema").LeavePolicy & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    deleteLeavePolicy(id: string): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-policy.schema").LeavePolicy, {}, {}> & import("./models/leave-policy.schema").LeavePolicy & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    createLeaveRequest(createLeaveRequestDto: CreateLeaveRequestDto): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-request.schema").LeaveRequest, {}, {}> & import("./models/leave-request.schema").LeaveRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getLeaveRequestById(id: string): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-request.schema").LeaveRequest, {}, {}> & import("./models/leave-request.schema").LeaveRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateLeaveRequest(id: string, updateLeaveRequestDto: UpdateLeaveRequestDto): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-request.schema").LeaveRequest, {}, {}> & import("./models/leave-request.schema").LeaveRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    deleteLeaveRequest(id: string): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-request.schema").LeaveRequest, {}, {}> & import("./models/leave-request.schema").LeaveRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    createLeaveEntitlement(createLeaveEntitlementDto: CreateLeaveEntitlementDto): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-entitlement.schema").LeaveEntitlement, {}, {}> & import("./models/leave-entitlement.schema").LeaveEntitlement & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getLeaveEntitlement(employeeId: string, leaveTypeId: string): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-entitlement.schema").LeaveEntitlement, {}, {}> & import("./models/leave-entitlement.schema").LeaveEntitlement & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateLeaveEntitlement(id: string, updateLeaveEntitlementDto: UpdateLeaveEntitlementDto): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-entitlement.schema").LeaveEntitlement, {}, {}> & import("./models/leave-entitlement.schema").LeaveEntitlement & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    createLeaveAdjustment(createLeaveAdjustmentDto: CreateLeaveAdjustmentDto): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-adjustment.schema").LeaveAdjustment, {}, {}> & import("./models/leave-adjustment.schema").LeaveAdjustment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getLeaveAdjustments(employeeId: string): Promise<(import("mongoose").Document<unknown, {}, import("./models/leave-adjustment.schema").LeaveAdjustment, {}, {}> & import("./models/leave-adjustment.schema").LeaveAdjustment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    deleteLeaveAdjustment(id: string): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-adjustment.schema").LeaveAdjustment, {}, {}> & import("./models/leave-adjustment.schema").LeaveAdjustment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    createLeaveCategory(createLeaveCategoryDto: CreateLeaveCategoryDto): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-category.schema").LeaveCategory, {}, {}> & import("./models/leave-category.schema").LeaveCategory & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    createLeaveType(createLeaveTypeDto: CreateLeaveTypeDto): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-type.schema").LeaveType, {}, {}> & import("./models/leave-type.schema").LeaveType & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateLeaveType(id: string, updateLeaveTypeDto: UpdateLeaveTypeDto): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-type.schema").LeaveType, {}, {}> & import("./models/leave-type.schema").LeaveType & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    approveLeaveRequest(id: string, approveLeaveRequestDto: ApproveLeaveRequestDto, req: any): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-request.schema").LeaveRequest, {}, {}> & import("./models/leave-request.schema").LeaveRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    rejectLeaveRequest(id: string, rejectLeaveRequestDto: RejectLeaveRequestDto, req: any): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-request.schema").LeaveRequest, {}, {}> & import("./models/leave-request.schema").LeaveRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    finalizeLeaveRequest(finalizeDto: FinalizeLeaveRequestDto): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-request.schema").LeaveRequest, {}, {}> & import("./models/leave-request.schema").LeaveRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    hrOverrideDecision(overrideDto: HrOverrideDecisionDto): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-request.schema").LeaveRequest, {}, {}> & import("./models/leave-request.schema").LeaveRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    processMultipleLeaveRequests(processDto: ProcessMultipleRequestsDto): Promise<(import("mongoose").Document<unknown, {}, import("./models/leave-request.schema").LeaveRequest, {}, {}> & import("./models/leave-request.schema").LeaveRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    })[]>;
    getEmployeeLeaveBalance(employeeId: string, leaveTypeId?: string): Promise<any>;
    cancelLeaveRequest(id: string): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-request.schema").LeaveRequest, {}, {}> & import("./models/leave-request.schema").LeaveRequest & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    getLeaveBalanceDetails(employeeId: string, leaveTypeId?: string): Promise<any>;
    getPastLeaveRequests(employeeId: string, fromDate?: string, toDate?: string, status?: string, leaveTypeId?: string): Promise<any[]>;
    filterLeaveHistory(filterDto: FilterLeaveHistoryDto): Promise<any>;
    getTeamLeaveBalances(managerId: string, upcomingFromDate?: string, upcomingToDate?: string, departmentId?: string): Promise<any>;
    filterTeamLeaveData(filterDto: FilterTeamLeaveDataDto): Promise<any>;
    flagIrregularPattern(flagDto: FlagIrregularPatternDto): Promise<any>;
    autoAccrueLeave(accrueDto: AutoAccrueLeaveDto): Promise<any>;
    autoAccrueAllEmployees(accrueAllDto: AccrueAllEmployeesDto): Promise<any>;
    runCarryForward(carryForwardDto: RunCarryForwardDto): Promise<any>;
    adjustAccrual(adjustmentDto: AccrualAdjustmentDto): Promise<any>;
    calculateAccrual(calculateAccrualDto: CalculateAccrualDto): Promise<void>;
    assignPersonalizedEntitlement(employeeId: string, leaveTypeId: string, personalizedEntitlement: number): Promise<import("mongoose").Document<unknown, {}, import("./models/leave-entitlement.schema").LeaveEntitlement, {}, {}> & import("./models/leave-entitlement.schema").LeaveEntitlement & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
}
