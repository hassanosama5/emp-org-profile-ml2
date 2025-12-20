import { PerformanceService } from './performance.service';
import { CreateAppraisalTemplateDto } from './dto/create-appraisal-template.dto';
import { UpdateAppraisalTemplateDto } from './dto/update-appraisal-template.dto';
import { CreateAppraisalCycleDto } from './dto/create-appraisal-cycle.dto';
import { UpsertAppraisalRecordDto } from './dto/upsert-appraisal-record.dto';
import { SubmitDisputeDto } from './dto/submit-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
export declare class PerformanceController {
    private readonly performanceService;
    constructor(performanceService: PerformanceService);
    createTemplate(dto: CreateAppraisalTemplateDto): Promise<import("./models/appraisal-template.schema").AppraisalTemplate>;
    findAllTemplates(): Promise<import("./models/appraisal-template.schema").AppraisalTemplate[]>;
    findTemplateById(id: string): Promise<import("./models/appraisal-template.schema").AppraisalTemplate>;
    updateTemplate(id: string, dto: UpdateAppraisalTemplateDto): Promise<import("./models/appraisal-template.schema").AppraisalTemplate>;
    createCycle(dto: CreateAppraisalCycleDto): Promise<{
        cycle: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./models/appraisal-cycle.schema").AppraisalCycle, {}, {}> & import("./models/appraisal-cycle.schema").AppraisalCycle & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./models/appraisal-cycle.schema").AppraisalCycle, {}, {}> & import("./models/appraisal-cycle.schema").AppraisalCycle & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>;
        assignments: import("mongoose").MergeType<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./models/appraisal-assignment.schema").AppraisalAssignment, {}, {}> & import("./models/appraisal-assignment.schema").AppraisalAssignment & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, import("./models/appraisal-assignment.schema").AppraisalAssignment, {}, {}> & import("./models/appraisal-assignment.schema").AppraisalAssignment & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>, Omit<{
            cycleId: import("mongoose").Types.ObjectId;
            templateId: import("mongoose").Types.ObjectId;
            employeeProfileId: import("mongoose").Types.ObjectId;
            managerProfileId: import("mongoose").Types.ObjectId;
            departmentId: import("mongoose").Types.ObjectId;
            positionId: import("mongoose").Types.ObjectId;
            status: import("./enums/performance.enums").AppraisalAssignmentStatus.NOT_STARTED;
            dueDate: string;
            assignedAt: Date;
        }, "_id">>[];
    }>;
    findAllCycles(): Promise<import("./models/appraisal-cycle.schema").AppraisalCycle[]>;
    findCycleById(id: string): Promise<import("./models/appraisal-cycle.schema").AppraisalCycle>;
    activateCycle(id: string): Promise<import("./models/appraisal-cycle.schema").AppraisalCycle>;
    publishCycle(id: string): Promise<void>;
    closeCycle(id: string): Promise<import("./models/appraisal-cycle.schema").AppraisalCycle>;
    archiveCycle(id: string): Promise<import("./models/appraisal-cycle.schema").AppraisalCycle>;
    getAssignmentsForManager(managerProfileId: string, cycleId?: string): Promise<(import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, import("./models/appraisal-assignment.schema").AppraisalAssignment, {}, {}> & import("./models/appraisal-assignment.schema").AppraisalAssignment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
    getAssignmentsForEmployee(employeeProfileId: string, cycleId?: string): Promise<(import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, import("./models/appraisal-assignment.schema").AppraisalAssignment, {}, {}> & import("./models/appraisal-assignment.schema").AppraisalAssignment & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
    upsertAppraisalRecord(assignmentId: string, managerProfileId: string, dto: UpsertAppraisalRecordDto): Promise<import("./models/appraisal-record.schema").AppraisalRecord>;
    submitAppraisalRecord(id: string, managerProfileId: string): Promise<import("./models/appraisal-record.schema").AppraisalRecord>;
    getEmployeeAppraisals(employeeProfileId: string): Promise<(import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, import("./models/appraisal-record.schema").AppraisalRecord, {}, {}> & import("./models/appraisal-record.schema").AppraisalRecord & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>)[]>;
    submitDispute(appraisalId: string, employeeProfileId: string, dto: SubmitDisputeDto): Promise<import("./models/appraisal-dispute.schema").AppraisalDispute>;
    resolveDispute(id: string, resolverEmployeeId: string, dto: ResolveDisputeDto): Promise<import("./models/appraisal-dispute.schema").AppraisalDispute>;
}
