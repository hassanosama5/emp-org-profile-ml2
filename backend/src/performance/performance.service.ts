// src/performance/performance.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { EmployeeProfileService } from '../employee-profile/employee-profile.service';
import { TimeManagementService } from '../time-management/services/time-management.service';

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
  AppraisalTemplateType,
} from './enums/performance.enums';

// --------- DTOs ---------
import { CreateAppraisalTemplateDto } from './dto/create-appraisal-template.dto';
import { UpdateAppraisalTemplateDto } from './dto/update-appraisal-template.dto';
import { CreateAppraisalCycleDto } from './dto/create-appraisal-cycle.dto';
import { UpsertAppraisalRecordDto } from './dto/upsert-appraisal-record.dto';
import { SubmitDisputeDto } from './dto/submit-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { BulkAssignmentDto } from './dto/bulk-assignment.dto';

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

    @InjectModel('NotificationLog')
    private readonly notificationLogModel: Model<any>,

    private readonly notificationsService: NotificationsService,
    private readonly employeeProfileService: EmployeeProfileService,
    private readonly timeManagementService: TimeManagementService,
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
      employeeAcknowledgementDueDate: dto
        .employeeAcknowledgementDueDate,
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
        positionId: a.positionId
          ? new Types.ObjectId(a.positionId)
          : undefined,
        status: AppraisalAssignmentStatus.NOT_STARTED,
        dueDate: a.dueDate ?? dto.managerDueDate ?? dto.endDate,
        assignedAt: new Date(),
      })),
    );

    // Send notifications to managers when assignments are created (REQ-PP-05)
    // Group assignments by manager to avoid duplicate notifications
    const managerAssignments = new Map<string, any[]>();
    for (const assignment of assignmentDocs) {
      const managerId = assignment.managerProfileId.toString();
      if (!managerAssignments.has(managerId)) {
        managerAssignments.set(managerId, []);
      }
      managerAssignments.get(managerId)!.push(assignment);
    }

    // Send notification to each manager
    for (const [managerId, assignments] of managerAssignments.entries()) {
      try {
        const employeeCount = assignments.length;
        const cycleName = cycle.name;
        const dueDate = dto.managerDueDate 
          ? new Date(dto.managerDueDate).toLocaleDateString()
          : new Date(dto.endDate).toLocaleDateString();

        await this.notificationLogModel.create({
          to: new Types.ObjectId(managerId),
          type: NotificationType.APPRAISAL_ASSIGNED,
          message: `You have ${employeeCount} new appraisal form${employeeCount > 1 ? 's' : ''} assigned for cycle "${cycleName}". Due date: ${dueDate}. Please complete the appraisals in the Performance section.`,
          data: {
            cycleId: cycle._id.toString(),
            cycleName: cycleName,
            assignmentCount: employeeCount,
            dueDate: dto.managerDueDate ?? dto.endDate,
            assignmentIds: assignments.map(a => a._id.toString()),
          },
          isRead: false,
        });

        console.log(
          `[REQ-PP-05] Sent APPRAISAL_ASSIGNED notification to manager ${managerId} for ${employeeCount} assignment(s)`,
        );
      } catch (error) {
        console.error(
          `Failed to send notification to manager ${managerId}:`,
          error,
        );
        // Don't fail the cycle creation if notification fails
      }
    }

    return { cycle, assignments: assignmentDocs };
  }

  // REQ-PP-05: Bulk assignment for existing cycles
  async createBulkAssignments(dto: BulkAssignmentDto) {
    const cycle = await this.cycleModel.findById(dto.cycleId).exec();
    if (!cycle) {
      throw new NotFoundException('Appraisal cycle not found');
    }

    // Validate all assignments
    for (const assignment of dto.assignments) {
      if (!Types.ObjectId.isValid(assignment.employeeProfileId)) {
        throw new BadRequestException(
          `Invalid employeeProfileId: ${assignment.employeeProfileId}`,
        );
      }
      if (!Types.ObjectId.isValid(assignment.managerProfileId)) {
        throw new BadRequestException(
          `Invalid managerProfileId: ${assignment.managerProfileId}`,
        );
      }
      if (!Types.ObjectId.isValid(assignment.templateId)) {
        throw new BadRequestException(
          `Invalid templateId: ${assignment.templateId}`,
        );
      }
    }

    const assignmentDocs = await this.assignmentModel.insertMany(
      dto.assignments.map((a) => ({
        cycleId: cycle._id,
        templateId: new Types.ObjectId(a.templateId),
        employeeProfileId: new Types.ObjectId(a.employeeProfileId),
        managerProfileId: new Types.ObjectId(a.managerProfileId),
        departmentId: new Types.ObjectId(a.departmentId),
        positionId: a.positionId
          ? new Types.ObjectId(a.positionId)
          : undefined,
        status: AppraisalAssignmentStatus.NOT_STARTED,
        dueDate: a.dueDate
          ? new Date(a.dueDate)
          : cycle.managerDueDate ?? cycle.endDate,
        assignedAt: new Date(),
      })),
    );

    // Send notifications to managers when assignments are created (REQ-PP-05)
    const managerAssignments = new Map<string, any[]>();
    for (const assignment of assignmentDocs) {
      const managerId = assignment.managerProfileId.toString();
      if (!managerAssignments.has(managerId)) {
        managerAssignments.set(managerId, []);
      }
      managerAssignments.get(managerId)!.push(assignment);
    }

    // Send notification to each manager
    for (const [managerId, assignments] of managerAssignments.entries()) {
      try {
        await this.notificationsService.createNotification(
          managerId,
          NotificationType.APPRAISAL_ASSIGNED,
          `You have ${assignments.length} new appraisal assignment(s) in cycle "${cycle.name}". Please complete them by ${new Date(cycle.managerDueDate || cycle.endDate).toLocaleDateString()}.`,
          {
            cycleId: cycle._id.toString(),
            cycleName: cycle.name,
            assignmentCount: assignments.length,
          },
        );
      } catch (error) {
        console.error(
          `Failed to send notification to manager ${managerId}:`,
          error,
        );
      }
    }

    return { assignments: assignmentDocs };
  }

  // REQ-PP-02: Automatic Probationary Appraisals
  // This method can be called by a scheduled job (cron) or manually
  async scheduleProbationaryAppraisals(): Promise<{
    scheduled: number;
    employees: string[];
  }> {
    // Find employees in PROBATION status
    const probationEmployees = await this.employeeProfileService.findEmployeesByStatus(
      'PROBATION',
    );

    if (!probationEmployees || probationEmployees.length === 0) {
      return { scheduled: 0, employees: [] };
    }

    const now = new Date();
    const scheduledEmployees: string[] = [];

    // Find PROBATIONARY appraisal template
    const probationTemplate = await this.templateModel
      .findOne({ templateType: AppraisalTemplateType.PROBATIONARY, isActive: true })
      .exec();

    if (!probationTemplate) {
      console.warn(
        'No active PROBATIONARY template found. Cannot schedule probationary appraisals.',
      );
      return { scheduled: 0, employees: [] };
    }

    // For each probation employee, check if probation period is ending soon (e.g., within 30 days)
    // or if they've been on probation for a certain period (e.g., 3 months)
    for (const employee of probationEmployees) {
      if (!employee.dateOfHire) continue;

      const hireDate = new Date(employee.dateOfHire);
      const monthsOnProbation = Math.floor(
        (now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30),
      );

      // Schedule appraisal if employee has been on probation for 3+ months
      // or if probation period is ending within 30 days (assuming 6-month probation)
      const probationPeriodMonths = 6; // Default probation period
      const monthsRemaining = probationPeriodMonths - monthsOnProbation;

      if (monthsOnProbation >= 3 || monthsRemaining <= 1) {
        // Check if appraisal already exists for this employee
        const existingAssignment = await this.assignmentModel
          .findOne({
            employeeProfileId: (employee as any)._id,
            templateId: probationTemplate._id,
            status: {
              $in: [
                AppraisalAssignmentStatus.NOT_STARTED,
                AppraisalAssignmentStatus.IN_PROGRESS,
              ],
            },
          })
          .exec();

        if (!existingAssignment) {
          // Create probationary appraisal assignment
          // Find employee's manager (supervisor)
          const managerPositionId = employee.supervisorPositionId;
          if (!managerPositionId) {
            console.warn(
              `Employee ${employee.employeeNumber} has no supervisor. Skipping probationary appraisal.`,
            );
            continue;
          }

          // Find employees in the supervisor position
          const managers = await this.employeeProfileService.findEmployeesByPosition(
            managerPositionId.toString(),
          );

          if (!managers || managers.length === 0) {
            console.warn(
              `No manager found for position ${managerPositionId}. Skipping probationary appraisal for ${employee.employeeNumber}.`,
            );
            continue;
          }

          const manager = managers[0]; // Use first manager found

          // Create a probationary cycle if it doesn't exist for this period
          const cycleName = `Probationary Appraisal - ${now.getFullYear()} Q${Math.ceil((now.getMonth() + 1) / 3)}`;
          let cycle = await this.cycleModel
            .findOne({ name: cycleName, cycleType: 'PROBATIONARY' })
            .exec();

          if (!cycle) {
            const cycleStartDate = new Date(now);
            cycleStartDate.setMonth(cycleStartDate.getMonth() - 1);
            const cycleEndDate = new Date(now);
            cycleEndDate.setMonth(cycleEndDate.getMonth() + 1);

            cycle = await new this.cycleModel({
              name: cycleName,
              description: `Automatic probationary appraisal cycle for ${now.toLocaleDateString()}`,
              cycleType: AppraisalTemplateType.PROBATIONARY,
              startDate: cycleStartDate,
              endDate: cycleEndDate,
              managerDueDate: cycleEndDate,
              status: AppraisalCycleStatus.ACTIVE,
            }).save();
          }

          // Create assignment
          const assignment = await new this.assignmentModel({
            cycleId: cycle._id,
            templateId: probationTemplate._id,
            employeeProfileId: (employee as any)._id,
            managerProfileId: (manager as any)._id,
            departmentId: employee.primaryDepartmentId,
            positionId: employee.primaryPositionId,
            status: AppraisalAssignmentStatus.NOT_STARTED,
            dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            assignedAt: new Date(),
          }).save();

          // Send notification to manager
          try {
            await this.notificationsService.createNotification(
              (manager as any)._id.toString(),
              NotificationType.APPRAISAL_ASSIGNED,
              `Probationary appraisal assigned for ${employee.fullName} (${employee.employeeNumber}). Due date: ${new Date(assignment.dueDate).toLocaleDateString()}.`,
              {
                cycleId: cycle._id.toString(),
                cycleName: cycle.name,
                assignmentId: assignment._id.toString(),
              },
            );
          } catch (error) {
            console.error(
              `Failed to send notification to manager ${(manager as any)._id}:`,
              error,
            );
          }

          scheduledEmployees.push(employee.employeeNumber);
        }
      }
    }

    return {
      scheduled: scheduledEmployees.length,
      employees: scheduledEmployees,
    };
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

  async publishCycle(id: string): Promise<AppraisalCycle> {
    const cycle = await this.cycleModel.findById(id).exec();
    if (!cycle) throw new NotFoundException('Appraisal cycle not found');

    // Update all submitted appraisals to published status
    const updateResult = await this.recordModel.updateMany(
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
    ).exec();

    // Get all published appraisals to send notifications and update profiles
    const publishedAppraisals = await this.recordModel
      .find({
        cycleId: cycle._id,
        status: AppraisalRecordStatus.HR_PUBLISHED,
        hrPublishedAt: { $exists: true },
      })
      .populate('employeeProfileId', 'firstName lastName workEmail')
      .populate('cycleId', 'name')
      .populate('templateId', 'ratingScale')
      .lean()
      .exec();

    // Send notifications and update profiles for each employee (N-022, BR 6)
    for (const appraisal of publishedAppraisals) {
      const employee = appraisal.employeeProfileId as any;
      const cycleName = (appraisal.cycleId as any)?.name || 'Appraisal Cycle';
      const template = appraisal.templateId as any;
      
      if (employee && employee._id) {
        const employeeId = employee._id.toString();
        const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee';
        const score = appraisal.totalScore ?? 'N/A';
        const rating = appraisal.overallRatingLabel || 'N/A';

        // Send notification (N-022)
        try {
          await this.notificationLogModel.create({
            to: new Types.ObjectId(employeeId),
            type: NotificationType.APPRAISAL_PUBLISHED,
            message: `Your appraisal for ${cycleName} has been published. Score: ${score}, Rating: ${rating}. View your appraisal details in the Performance section.`,
            data: {
              appraisalId: appraisal._id.toString(),
              cycleId: cycle._id.toString(),
              cycleName: cycleName,
              score: appraisal.totalScore,
              rating: appraisal.overallRatingLabel,
              publishedAt: new Date().toISOString(),
            },
            isRead: false,
          });

          console.log(
            `[N-022] Sent APPRAISAL_PUBLISHED notification to employee ${employeeId} (${employeeName})`,
          );
        } catch (error) {
          console.error(
            `Failed to send notification to employee ${employeeId}:`,
            error,
          );
          // Don't fail the publish operation if notification fails
        }

        // Update employee profile with appraisal results (BR 6)
        try {
          const ratingScaleType = template?.ratingScale?.type || undefined;
          const developmentPlanSummary = appraisal.improvementAreas 
            ? `${appraisal.strengths || ''}${appraisal.strengths && appraisal.improvementAreas ? ' | ' : ''}${appraisal.improvementAreas}`.trim()
            : appraisal.strengths || undefined;

          await this.employeeProfileService.updateLastAppraisal(employeeId, {
            lastAppraisalRecordId: new Types.ObjectId(appraisal._id.toString()),
            lastAppraisalCycleId: cycle._id,
            lastAppraisalTemplateId: new Types.ObjectId(appraisal.templateId.toString()),
            lastAppraisalDate: appraisal.hrPublishedAt ? new Date(appraisal.hrPublishedAt) : new Date(),
            lastAppraisalScore: appraisal.totalScore,
            lastAppraisalRatingLabel: appraisal.overallRatingLabel,
            lastAppraisalScaleType: ratingScaleType,
            lastDevelopmentPlanSummary: developmentPlanSummary,
          });

          console.log(
            `[BR 6] Updated employee profile ${employeeId} (${employeeName}) with appraisal results`,
          );
        } catch (error) {
          console.error(
            `Failed to update employee profile ${employeeId} with appraisal results:`,
            error,
          );
          // Don't fail the publish operation if profile update fails
        }
      }
    }

    cycle.status = AppraisalCycleStatus.CLOSED;
    cycle.publishedAt = new Date();
    await cycle.save();

    console.log(
      `Published ${updateResult.modifiedCount} appraisals for cycle ${cycle.name}`,
    );

    return cycle;
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
  //                 CYCLE PROGRESS & REMINDERS
  // =============================================================

  async getCycleProgress(cycleId: string) {
    const cycle = await this.cycleModel.findById(cycleId).lean().exec();
    if (!cycle) throw new NotFoundException('Appraisal cycle not found');

    const assignments = await this.assignmentModel
      .find({ cycleId: cycle._id })
      .lean()
      .exec();

    const total = assignments.length;

    const byStatus: Record<string, number> = {};
    for (const a of assignments) {
      const key = a.status || AppraisalAssignmentStatus.NOT_STARTED;
      byStatus[key] = (byStatus[key] || 0) + 1;
    }

    const completedCount =
      byStatus[AppraisalAssignmentStatus.SUBMITTED] || 0;

    const byDepartmentMap: Record<
      string,
      { total: number; submitted: number }
    > = {};

    for (const a of assignments) {
      const depId = String(a.departmentId);
      if (!byDepartmentMap[depId]) {
        byDepartmentMap[depId] = { total: 0, submitted: 0 };
      }
      byDepartmentMap[depId].total += 1;
      if (a.status === AppraisalAssignmentStatus.SUBMITTED) {
        byDepartmentMap[depId].submitted += 1;
      }
    }

    const byDepartment = Object.entries(byDepartmentMap).map(
      ([departmentId, stats]) => ({
        departmentId,
        totalAssignments: stats.total,
        submitted: stats.submitted,
        completionRate:
          stats.total === 0
            ? 0
            : Math.round((stats.submitted / stats.total) * 100),
      }),
    );

    return {
      cycleId: cycle._id,
      name: cycle.name,
      status: cycle.status,
      totalAssignments: total,
      byStatus,
      completionRate:
        total === 0 ? 0 : Math.round((completedCount / total) * 100),
      byDepartment,
    };
  }

  async sendCycleReminders(cycleId: string) {
    const cycle = await this.cycleModel.findById(cycleId).lean().exec();
    if (!cycle) throw new NotFoundException('Appraisal cycle not found');

    const pendingAssignments = await this.assignmentModel
      .find({
        cycleId: cycle._id,
        status: {
          $in: [
            AppraisalAssignmentStatus.NOT_STARTED,
            AppraisalAssignmentStatus.IN_PROGRESS,
          ],
        },
      })
      .lean()
      .exec();

    // TODO: integrate with Notification subsystem
    // For now just return the list we would send reminders to
    return {
      cycleId: cycle._id,
      cycleName: cycle.name,
      pendingCount: pendingAssignments.length,
      pendingAssignments,
    };
  }

  // =============================================================
  //                 ASSIGNMENT QUERY LOGIC
  // =============================================================

  async getAssignmentsForManager(managerProfileId: string, cycleId?: string) {
  if (!Types.ObjectId.isValid(managerProfileId)) {
    throw new BadRequestException('Invalid managerProfileId');
  }

  const filter: any = {
    managerProfileId: new Types.ObjectId(managerProfileId),
  };
  if (cycleId) {
    if (!Types.ObjectId.isValid(cycleId)) {
      throw new BadRequestException('Invalid cycleId');
    }
    filter.cycleId = new Types.ObjectId(cycleId);
  }

  // Optional debug logging while you test
  // console.log('getAssignmentsForManager filter =', filter);

  return this.assignmentModel
    .find(filter)
    .populate('employeeProfileId templateId cycleId')
    .lean()
    .exec();
}

  async getAssignmentsForEmployee(employeeProfileId: string, cycleId?: string) {
  if (!Types.ObjectId.isValid(employeeProfileId)) {
    throw new BadRequestException('Invalid employeeProfileId');
  }

  const filter: any = {
    employeeProfileId: new Types.ObjectId(employeeProfileId),
  };
  if (cycleId) {
    if (!Types.ObjectId.isValid(cycleId)) {
      throw new BadRequestException('Invalid cycleId');
    }
    filter.cycleId = new Types.ObjectId(cycleId);
  }

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
    if (!employeeProfileId) {
      throw new BadRequestException('employeeProfileId is required');
    }

    if (!Types.ObjectId.isValid(employeeProfileId)) {
      throw new BadRequestException(`Invalid employeeProfileId format: ${employeeProfileId}`);
    }

    try {
      const appraisals = await this.recordModel
        .find({
          employeeProfileId: new Types.ObjectId(employeeProfileId),
          status: { $in: [AppraisalRecordStatus.HR_PUBLISHED] },
        })
        .populate('assignmentId cycleId templateId managerProfileId')
        .lean()
        .exec();

      return appraisals || [];
    } catch (error: any) {
      console.error(
        `Failed to fetch appraisals for employee ${employeeProfileId}:`,
        error?.message || error,
      );
      throw new BadRequestException(
        `Failed to fetch appraisals: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // Get time management summary for employee during appraisal period (REQ-AE-03)
  async getTimeManagementSummaryForAppraisal(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    currentUserId: string,
  ) {
    try {
      // Validate employeeId format
      if (!Types.ObjectId.isValid(employeeId)) {
        throw new BadRequestException(`Invalid employeeId format: ${employeeId}`);
      }

      console.log(
        `[Performance] Fetching TM summary for employee ${employeeId} from ${startDate} to ${endDate}`,
      );

      const history = await this.timeManagementService.getEmployeeAttendanceHistory(
        {
          employeeId,
          startDate,
          endDate,
          includeExceptions: true,
          includeOvertime: true,
        },
        currentUserId || 'system',
      );

      console.log(
        `[Performance] TM history received: ${history?.records?.length || 0} records`,
      );

      // Calculate summary metrics from the history response
      // The getEmployeeAttendanceHistory returns: { records, summary, ... }
      const records = history.records || [];
      const summary = (history.summary || {}) as any;
      
      // Extract exceptions from records (each record has exceptions array)
      const allExceptions = records.flatMap((r: any) => r.exceptions || []);
      
      const totalDays = summary.totalDays || records.length;
      const totalWorkHours = summary.totalWorkHours || records.reduce(
        (sum, r: any) => sum + (r.totalWorkHours || 0),
        0,
      );
      const totalWorkMinutes = records.reduce(
        (sum, r: any) => sum + (r.totalWorkMinutes || 0),
        0,
      );
      
      // Count missed punches from records (check if record has hasMissedPunch or missing punches)
      const missedPunches = records.filter((r: any) => {
        // Check if there's a missing punch (no clock in or no clock out)
        const hasClockIn = r.punches?.some((p: any) => p.type === 'IN');
        const hasClockOut = r.punches?.some((p: any) => p.type === 'OUT');
        return r.hasMissedPunch || (!hasClockIn || !hasClockOut);
      }).length;
      
      const lateArrivals = summary.lateDays || records.filter((r: any) => r.status?.isLate).length;
      const earlyDepartures = summary.earlyLeaveDays || records.filter((r: any) => r.status?.earlyLeave).length;
      const absences = summary.absentDays || records.filter((r: any) => !r.status?.isPresent).length;

      return {
        period: {
          startDate,
          endDate,
          totalDays,
        },
        attendance: {
          totalWorkHours: Math.round(totalWorkHours * 100) / 100,
          totalWorkMinutes,
          averageHoursPerDay:
            totalDays > 0
              ? Math.round((totalWorkHours / totalDays) * 100) / 100
              : 0,
        },
        punctuality: {
          missedPunches,
          lateArrivals,
          earlyDepartures,
          absences,
          punctualityScore:
            totalDays > 0
              ? Math.round(
                  ((totalDays - lateArrivals - earlyDepartures - absences) /
                    totalDays) *
                    100,
                )
              : 100,
        },
        records: records.slice(0, 10), // Last 10 records for reference
        exceptions: allExceptions.slice(0, 10), // Last 10 exceptions
      };
    } catch (error: any) {
      console.error(
        `[Performance] Failed to fetch time management data for employee ${employeeId}:`,
        error?.message || error,
        error?.stack,
      );
      
      // If it's a validation error, re-throw it
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // For other errors, return empty summary (don't throw, just return empty data)
      // This allows the appraisal form to still work even if TM data is unavailable
      return {
        period: {
          startDate,
          endDate,
          totalDays: 0,
        },
        attendance: {
          totalWorkHours: 0,
          totalWorkMinutes: 0,
          averageHoursPerDay: 0,
        },
        punctuality: {
          missedPunches: 0,
          lateArrivals: 0,
          earlyDepartures: 0,
          absences: 0,
          punctualityScore: 0,
        },
        records: [],
        exceptions: [],
        error: error?.message || 'Time management data not available',
      };
    }
  }

  async acknowledgeAppraisal(
    recordId: string,
    employeeProfileId: string,
    comment?: string,
  ): Promise<AppraisalRecord> {
    if (!Types.ObjectId.isValid(recordId)) {
      throw new BadRequestException('Invalid appraisal record ID');
    }
    if (!Types.ObjectId.isValid(employeeProfileId)) {
      throw new BadRequestException('Invalid employeeProfileId');
    }

    const record = await this.recordModel.findById(recordId).exec();
    if (!record) {
      throw new NotFoundException('Appraisal record not found');
    }

    // Verify the employee owns this appraisal
    if (record.employeeProfileId.toString() !== employeeProfileId) {
      throw new BadRequestException(
        'Not authorized to acknowledge this appraisal',
      );
    }

    // Only allow acknowledgment of published appraisals
    if (record.status !== AppraisalRecordStatus.HR_PUBLISHED) {
      throw new BadRequestException(
        'Only published appraisals can be acknowledged',
      );
    }

    // Update acknowledgment fields
    record.employeeAcknowledgedAt = new Date();
    if (comment) {
      record.employeeAcknowledgementComment = comment;
    }
    await record.save();

    return record;
  }

  async getAppraisalById(id: string) {
    const record = await this.recordModel
      .findById(id)
      .populate('assignmentId cycleId templateId managerProfileId')
      .lean()
      .exec();

    if (!record) {
      throw new NotFoundException('Appraisal record not found');
    }

    return record;
  }

  async getAppraisalsForReporting(filter: {
    cycleId?: string;
    departmentId?: string;
    status?: string;
  }) {
    const query: any = {};

    if (filter.cycleId) {
      query.cycleId = new Types.ObjectId(filter.cycleId);
    }
    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.departmentId) {
      const assignmentIds = await this.assignmentModel
        .find({
          departmentId: new Types.ObjectId(filter.departmentId),
        })
        .distinct('_id')
        .exec();

      if (assignmentIds.length === 0) {
        return [];
      }

      query.assignmentId = { $in: assignmentIds };
    }

    return this.recordModel
      .find(query)
      .populate(
        'assignmentId cycleId templateId employeeProfileId managerProfileId',
      )
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

    // REQ-AE-07: 7-day dispute window enforcement
    if (record.status !== AppraisalRecordStatus.HR_PUBLISHED) {
      throw new BadRequestException(
        'Disputes can only be raised for published appraisals',
      );
    }

    if (!record.hrPublishedAt) {
      throw new BadRequestException(
        'Appraisal publication date is missing. Cannot determine dispute window.',
      );
    }

    const publishedDate = new Date(record.hrPublishedAt);
    const now = new Date();
    const daysSincePublication = Math.floor(
      (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSincePublication < 0) {
      throw new BadRequestException(
        'Invalid publication date. Cannot submit dispute before publication.',
      );
    }

    if (daysSincePublication > 7) {
      throw new BadRequestException(
        `The 7-day dispute window has expired. This appraisal was published ${daysSincePublication} days ago. Disputes must be submitted within 7 days of publication.`,
      );
    }

    // Check if dispute already exists
    const existingDispute = await this.disputeModel
      .findOne({
        appraisalId: record._id,
        raisedByEmployeeId: new Types.ObjectId(employeeProfileId),
        status: { $in: [AppraisalDisputeStatus.OPEN, AppraisalDisputeStatus.UNDER_REVIEW] },
      })
      .exec();

    if (existingDispute) {
      throw new BadRequestException(
        'You have already submitted a dispute for this appraisal. Please wait for HR to review it.',
      );
    }

    const assignment = await this.assignmentModel
      .findById(record.assignmentId)
      .exec();
    if (!assignment) throw new NotFoundException('Assignment not found');

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

  async getDisputesForAppraisal(appraisalId: string) {
    return this.disputeModel
      .find({ appraisalId: new Types.ObjectId(appraisalId) })
      .lean()
      .exec();
  }

  async getDisputes(filter: { cycleId?: string; status?: string }) {
    const query: any = {};
    if (filter.cycleId) {
      query.cycleId = new Types.ObjectId(filter.cycleId);
    }
    if (filter.status) {
      query.status = filter.status;
    }

    return this.disputeModel.find(query).lean().exec();
  }

  async getDisputeById(id: string) {
    const dispute = await this.disputeModel.findById(id).lean().exec();

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    return dispute;
  }
}
