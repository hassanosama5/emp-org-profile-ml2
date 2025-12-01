// src/performance/performance.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

// --------- MODELS ---------
import {
  AppraisalTemplate,
  AppraisalTemplateDocument,
} from './models/appraisal-template.schema';

import {
  AppraisalCycle,
  AppraisalCycleDocument,
} from './models/appraisal-cycle.schema';

import {
  AppraisalAssignment,
  AppraisalAssignmentDocument,
} from './models/appraisal-assignment.schema';

import {
  AppraisalRecord,
  AppraisalRecordDocument,
} from './models/appraisal-record.schema';

import {
  AppraisalDispute,
  AppraisalDisputeDocument,
} from './models/appraisal-dispute.schema';

// --------- ENUMS ---------
import {
  AppraisalAssignmentStatus,
  AppraisalCycleStatus,
  AppraisalRecordStatus,
  AppraisalDisputeStatus,
} from './enums/performance.enums';

// --------- DTOs ---------
import { CreateAppraisalTemplateDto } from './dto/create-appraisal-template.dto';
import { UpdateAppraisalTemplateDto } from './dto/update-appraisal-template.dto';
import { CreateAppraisalCycleDto } from './dto/create-appraisal-cycle.dto';
import { UpsertAppraisalRecordDto } from './dto/upsert-appraisal-record.dto';
import { SubmitDisputeDto } from './dto/submit-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Injectable()
export class PerformanceService {
  constructor(
    @InjectModel(AppraisalTemplate.name)
    private readonly templateModel: Model<AppraisalTemplateDocument>,

    @InjectModel(AppraisalCycle.name)
    private readonly cycleModel: Model<AppraisalCycleDocument>,

    @InjectModel(AppraisalAssignment.name)
    private readonly assignmentModel: Model<AppraisalAssignmentDocument>,

    @InjectModel(AppraisalRecord.name)
    private readonly recordModel: Model<AppraisalRecordDocument>,

    @InjectModel(AppraisalDispute.name)
    private readonly disputeModel: Model<AppraisalDisputeDocument>,
  ) {}

  // =============================================================
  //                     TEMPLATE LOGIC
  // =============================================================

  async createTemplate(
    dto: CreateAppraisalTemplateDto,
  ): Promise<AppraisalTemplate> {
    const totalWeight = (dto.criteria || [])
      .map((c) => c.weight ?? 0)
      .reduce((a, b) => a + b, 0);

    if (totalWeight > 0 && totalWeight !== 100) {
      throw new BadRequestException(
        'Sum of criteria weights must be either 0 or 100.',
      );
    }

    const created = new this.templateModel({
      ...dto,
      applicableDepartmentIds: dto.applicableDepartmentIds || [],
      applicablePositionIds: dto.applicablePositionIds || [],
    });

    return created.save();
  }

  async findAllTemplates(): Promise<AppraisalTemplate[]> {
    return this.templateModel.find().lean().exec();
  }

  async findTemplateById(id: string): Promise<AppraisalTemplate> {
    const template = await this.templateModel.findById(id).lean().exec();
    if (!template) {
      throw new NotFoundException('Appraisal template not found');
    }
    return template;
  }

  async updateTemplate(
    id: string,
    dto: UpdateAppraisalTemplateDto,
  ): Promise<AppraisalTemplate> {
    const updated = await this.templateModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Appraisal template not found');
    }

    return updated;
  }

  async deleteTemplate(id: string): Promise<void> {
    const res = await this.templateModel.findByIdAndDelete(id).exec();
    if (!res) throw new NotFoundException('Appraisal template not found');
  }

  // =============================================================
  //             CYCLES & ASSIGNMENT CREATION LOGIC
  // =============================================================

  async createCycle(dto: CreateAppraisalCycleDto) {
    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('startDate must be before endDate');
    }

    const cycle = await new this.cycleModel({
      name: dto.name,
      description: dto.description,
      cycleType: dto.cycleType,
      startDate: dto.startDate,
      endDate: dto.endDate,
      managerDueDate: dto.managerDueDate,
      employeeAcknowledgementDueDate: dto.employeeAcknowledgementDueDate,
      templateAssignments: dto.templateAssignments || [],
      status: AppraisalCycleStatus.PLANNED,
    }).save();

    const assignmentDocs = await this.assignmentModel.insertMany(
      dto.assignments.map((a) => ({
        cycleId: cycle._id,
        templateId: new Types.ObjectId(a.templateId),
        employeeProfileId: new Types.ObjectId(a.employeeProfileId),
        managerProfileId: new Types.ObjectId(a.managerProfileId),
        departmentId: new Types.ObjectId(a.departmentId),
        positionId: a.positionId ? new Types.ObjectId(a.positionId) : undefined,
        status: AppraisalAssignmentStatus.NOT_STARTED,
        dueDate: a.dueDate ?? dto.managerDueDate ?? dto.endDate,
        assignedAt: new Date(),
      })),
    );

    return { cycle, assignments: assignmentDocs };
  }

  async findAllCycles(): Promise<AppraisalCycle[]> {
    return this.cycleModel.find().lean().exec();
  }

  async findCycleById(id: string): Promise<AppraisalCycle> {
    const cycle = await this.cycleModel.findById(id).lean().exec();
    if (!cycle) throw new NotFoundException('Appraisal cycle not found');
    return cycle;
  }

  async activateCycle(id: string): Promise<AppraisalCycle> {
    const cycle = await this.cycleModel
      .findByIdAndUpdate(
        id,
        { $set: { status: AppraisalCycleStatus.ACTIVE } },
        { new: true },
      )
      .exec();

    if (!cycle) throw new NotFoundException('Appraisal cycle not found');

    return cycle;
  }

  async publishCycle(id: string): Promise<void> {
    const cycle = await this.cycleModel.findById(id).exec();
    if (!cycle) throw new NotFoundException('Appraisal cycle not found');

    await this.recordModel.updateMany(
      {
        cycleId: cycle._id,
        status: AppraisalRecordStatus.MANAGER_SUBMITTED,
      },
      {
        $set: {
          status: AppraisalRecordStatus.HR_PUBLISHED,
          hrPublishedAt: new Date(),
        },
      },
    );

    cycle.status = AppraisalCycleStatus.CLOSED;
    cycle.publishedAt = new Date();
    await cycle.save();
  }

  async closeCycle(id: string): Promise<AppraisalCycle> {
    const cycle = await this.cycleModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: AppraisalCycleStatus.CLOSED,
            closedAt: new Date(),
          },
        },
        { new: true },
      )
      .exec();

    if (!cycle) throw new NotFoundException('Appraisal cycle not found');

    return cycle;
  }

  async archiveCycle(id: string): Promise<AppraisalCycle> {
    const cycle = await this.cycleModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: AppraisalCycleStatus.ARCHIVED,
            archivedAt: new Date(),
          },
        },
        { new: true },
      )
      .exec();

    if (!cycle) throw new NotFoundException('Appraisal cycle not found');

    await this.recordModel.updateMany(
      { cycleId: cycle._id },
      { $set: { archivedAt: new Date() } },
    );

    return cycle;
  }

  // =============================================================
  //                 ASSIGNMENT QUERY LOGIC
  // =============================================================

  async getAssignmentsForManager(managerProfileId: string, cycleId?: string) {
    const filter: any = { managerProfileId };
    if (cycleId) filter.cycleId = cycleId;

    return this.assignmentModel
      .find(filter)
      .populate('employeeProfileId templateId cycleId')
      .lean()
      .exec();
  }

  async getAssignmentsForEmployee(employeeProfileId: string, cycleId?: string) {
    const filter: any = { employeeProfileId };
    if (cycleId) filter.cycleId = cycleId;

    return this.assignmentModel
      .find(filter)
      .populate('templateId cycleId')
      .lean()
      .exec();
  }

  // =============================================================
  //                 APPRAISAL RECORD LOGIC
  // =============================================================

  async upsertAppraisalRecord(
    assignmentId: string,
    managerProfileId: string,
    dto: UpsertAppraisalRecordDto,
  ): Promise<AppraisalRecord> {
    const assignment = await this.assignmentModel.findById(assignmentId).exec();
    if (!assignment)
      throw new NotFoundException('Appraisal assignment not found');

    if (assignment.managerProfileId.toString() !== managerProfileId) {
      throw new BadRequestException('Manager not authorized');
    }

    let record: AppraisalRecordDocument | null = null;

    if (assignment.latestAppraisalId) {
      record = await this.recordModel
        .findById(assignment.latestAppraisalId)
        .exec();
    }

    if (!record) {
      record = new this.recordModel({
        assignmentId: assignment._id,
        cycleId: assignment.cycleId,
        templateId: assignment.templateId,
        employeeProfileId: assignment.employeeProfileId,
        managerProfileId: assignment.managerProfileId,
      });
    }

    record.ratings = dto.ratings;
    record.totalScore = dto.totalScore;
    record.overallRatingLabel = dto.overallRatingLabel;
    record.managerSummary = dto.managerSummary;
    record.strengths = dto.strengths;
    record.improvementAreas = dto.improvementAreas;
    record.status = AppraisalRecordStatus.DRAFT;

    await record.save();

    if (!assignment.latestAppraisalId) {
      assignment.latestAppraisalId = record._id;
      assignment.status = AppraisalAssignmentStatus.IN_PROGRESS;
      await assignment.save();
    }

    return record;
  }

  async submitAppraisalRecord(
    recordId: string,
    managerProfileId: string,
  ): Promise<AppraisalRecord> {
    const record = await this.recordModel.findById(recordId).exec();
    if (!record) throw new NotFoundException('Appraisal record not found');

    if (record.managerProfileId.toString() !== managerProfileId) {
      throw new BadRequestException('Not authorized to submit this record');
    }

    record.status = AppraisalRecordStatus.MANAGER_SUBMITTED;
    record.managerSubmittedAt = new Date();
    await record.save();

    await this.assignmentModel.findByIdAndUpdate(record.assignmentId, {
      $set: {
        status: AppraisalAssignmentStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });

    return record;
  }

  async getEmployeeAppraisals(employeeProfileId: string) {
    return this.recordModel
      .find({
        employeeProfileId,
        status: { $in: [AppraisalRecordStatus.HR_PUBLISHED] },
      })
      .populate('assignmentId cycleId templateId managerProfileId')
      .lean()
      .exec();
  }

  // =============================================================
  //                          DISPUTES
  // =============================================================

  async submitDispute(
    appraisalId: string,
    employeeProfileId: string,
    dto: SubmitDisputeDto,
  ): Promise<AppraisalDispute> {
    const record = await this.recordModel.findById(appraisalId).exec();
    if (!record) throw new NotFoundException('Appraisal record not found');

    if (record.employeeProfileId.toString() !== employeeProfileId) {
      throw new BadRequestException(
        'Employee cannot dispute another employee’s record',
      );
    }

    const assignment = await this.assignmentModel
      .findById(record.assignmentId)
      .exec();
    if (!assignment) throw new NotFoundException('Assignment not found');

    // ✅ FIX: Add _id manually because your schema defines _id manually
    const dispute = new this.disputeModel({
      _id: new Types.ObjectId(),
      appraisalId: record._id,
      assignmentId: assignment._id,
      cycleId: record.cycleId,
      raisedByEmployeeId: employeeProfileId,
      reason: dto.reason,
      details: dto.details,
      submittedAt: new Date(),
      status: AppraisalDisputeStatus.OPEN,
    });

    return dispute.save();
  }

  async resolveDispute(
    disputeId: string,
    resolverEmployeeId: string,
    dto: ResolveDisputeDto,
  ): Promise<AppraisalDispute> {
    const dispute = await this.disputeModel.findById(disputeId).exec();
    if (!dispute) throw new NotFoundException('Dispute not found');

    dispute.status = dto.status;
    dispute.resolutionSummary = dto.resolutionSummary;
    dispute.resolvedAt = new Date();
    dispute.resolvedByEmployeeId = resolverEmployeeId as any;

    await dispute.save();
    return dispute;
  }
}
