import { Model, Types } from 'mongoose';
import { AppraisalTemplate, AppraisalTemplateDocument } from './models/appraisal-template.schema';
import { AppraisalCycle, AppraisalCycleDocument } from './models/appraisal-cycle.schema';
import { AppraisalAssignment, AppraisalAssignmentDocument } from './models/appraisal-assignment.schema';
import { AppraisalRecord, AppraisalRecordDocument } from './models/appraisal-record.schema';
import { AppraisalDispute, AppraisalDisputeDocument } from './models/appraisal-dispute.schema';
import { AppraisalAssignmentStatus } from './enums/performance.enums';
import { CreateAppraisalTemplateDto } from './dto/create-appraisal-template.dto';
import { UpdateAppraisalTemplateDto } from './dto/update-appraisal-template.dto';
import { CreateAppraisalCycleDto } from './dto/create-appraisal-cycle.dto';
import { UpsertAppraisalRecordDto } from './dto/upsert-appraisal-record.dto';
import { SubmitDisputeDto } from './dto/submit-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
export declare class PerformanceService {
    private readonly templateModel;
    private readonly cycleModel;
    private readonly assignmentModel;
    private readonly recordModel;
    private readonly disputeModel;
    constructor(templateModel: Model<AppraisalTemplateDocument>, cycleModel: Model<AppraisalCycleDocument>, assignmentModel: Model<AppraisalAssignmentDocument>, recordModel: Model<AppraisalRecordDocument>, disputeModel: Model<AppraisalDisputeDocument>);
    createTemplate(dto: CreateAppraisalTemplateDto): Promise<AppraisalTemplate>;
    findAllTemplates(): Promise<AppraisalTemplate[]>;
    findTemplateById(id: string): Promise<AppraisalTemplate>;
    updateTemplate(id: string, dto: UpdateAppraisalTemplateDto): Promise<AppraisalTemplate>;
    deleteTemplate(id: string): Promise<void>;
    createCycle(dto: CreateAppraisalCycleDto): Promise<{
        cycle: import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, AppraisalCycle, {}, {}> & AppraisalCycle & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, AppraisalCycle, {}, {}> & AppraisalCycle & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: Types.ObjectId;
        }>;
        assignments: import("mongoose").MergeType<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, AppraisalAssignment, {}, {}> & AppraisalAssignment & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        }, {}, {}> & import("mongoose").Document<unknown, {}, AppraisalAssignment, {}, {}> & AppraisalAssignment & {
            _id: Types.ObjectId;
        } & {
            __v: number;
        } & Required<{
            _id: Types.ObjectId;
        }>, Omit<{
            cycleId: Types.ObjectId;
            templateId: Types.ObjectId;
            employeeProfileId: Types.ObjectId;
            managerProfileId: Types.ObjectId;
            departmentId: Types.ObjectId;
            positionId: Types.ObjectId;
            status: AppraisalAssignmentStatus.NOT_STARTED;
            dueDate: string;
            assignedAt: Date;
        }, "_id">>[];
    }>;
    findAllCycles(): Promise<AppraisalCycle[]>;
    findCycleById(id: string): Promise<AppraisalCycle>;
    activateCycle(id: string): Promise<AppraisalCycle>;
    publishCycle(id: string): Promise<void>;
    closeCycle(id: string): Promise<AppraisalCycle>;
    archiveCycle(id: string): Promise<AppraisalCycle>;
    getAssignmentsForManager(managerProfileId: string, cycleId?: string): Promise<(import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, AppraisalAssignment, {}, {}> & AppraisalAssignment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }> & Required<{
        _id: Types.ObjectId;
    }>)[]>;
    getAssignmentsForEmployee(employeeProfileId: string, cycleId?: string): Promise<(import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, AppraisalAssignment, {}, {}> & AppraisalAssignment & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }> & Required<{
        _id: Types.ObjectId;
    }>)[]>;
    upsertAppraisalRecord(assignmentId: string, managerProfileId: string, dto: UpsertAppraisalRecordDto): Promise<AppraisalRecord>;
    submitAppraisalRecord(recordId: string, managerProfileId: string): Promise<AppraisalRecord>;
    getEmployeeAppraisals(employeeProfileId: string): Promise<(import("mongoose").FlattenMaps<import("mongoose").Document<unknown, {}, AppraisalRecord, {}, {}> & AppraisalRecord & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }> & Required<{
        _id: Types.ObjectId;
    }>)[]>;
    submitDispute(appraisalId: string, employeeProfileId: string, dto: SubmitDisputeDto): Promise<AppraisalDispute>;
    resolveDispute(disputeId: string, resolverEmployeeId: string, dto: ResolveDisputeDto): Promise<AppraisalDispute>;
}
