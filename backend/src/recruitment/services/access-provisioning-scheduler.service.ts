import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RecruitmentService } from '../recruitment.service';
import { EmployeeProfileService } from '../../employee-profile/employee-profile.service';
import { EmployeeStatus, SystemRole } from '../../employee-profile/enums/employee-profile.enums';
import { TerminationRequest } from '../models/termination-request.schema';
import { TerminationStatus } from '../enums/termination-status.enum';
import { EmployeeProfile, EmployeeProfileDocument } from '../../employee-profile/models/employee-profile.schema';

/**
 * ONB-013: Automated Account Provisioning and Revocation Scheduler
 * 
 * User Story: As a HR Manager, I want automated account provisioning (SSO/email/tools) 
 * on start date and scheduled revocation on exit, so access is consistent and secure.
 * 
 * This service runs daily to:
 * 1. Automatically provision system access (SSO/email/tools) for employees 
 *    whose start date (dateOfHire or contractStartDate) is TODAY
 * 2. Automatically revoke system access for employees whose termination/end date is TODAY
 * 
 * BR: Provisioning and security must be consistent
 */
@Injectable()
export class AccessProvisioningSchedulerService {
  constructor(
    private readonly recruitmentService: RecruitmentService,
    private readonly employeeProfileService: EmployeeProfileService,
    @InjectModel(TerminationRequest.name)
    private terminationModel: Model<TerminationRequest>,
    @InjectModel(EmployeeProfile.name)
    private employeeModel: Model<EmployeeProfileDocument>,
  ) {}

  /**
   * ONB-013: Daily scheduled task to process automatic provisioning and revocation
   * Runs every day at 2:00 AM (configurable)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processScheduledAccessProvisioning() {
    console.log(
      `[ONB-013] Starting scheduled access provisioning/revocation at ${new Date().toISOString()}`,
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1); // Start of next day

    try {
      // 1. Find employees whose start date is today → Auto-provision access
      await this.provisionAccessForNewEmployees(today);

      // 2. Find employees whose termination/end date is today → Auto-revoke access
      await this.revokeAccessForTerminatedEmployees(today);

      console.log(
        `[ONB-013] Completed scheduled access provisioning/revocation at ${new Date().toISOString()}`,
      );
    } catch (error) {
      console.error(
        `[ONB-013] Error in scheduled access provisioning/revocation:`,
        error,
      );
    }
  }

  /**
   * ONB-013: Automatically provision access for employees whose start date is today
   */
  private async provisionAccessForNewEmployees(today: Date) {
    try {
      // Find employees whose start date (dateOfHire or contractStartDate) is today
      // and they have onboarding with IT tasks not yet completed
      // Note: New employees start as PROBATION until onboarding is completed
      // Use employee model directly to support MongoDB $in query for multiple statuses
      const employees = await this.employeeModel
        .find({
          status: { $in: [EmployeeStatus.INACTIVE, EmployeeStatus.PROBATION] }, // New employees (inactive or probation)
        })
        .lean()
        .exec();

      const employeesToProvision: any[] = [];

      for (const employee of employees || []) {
        const startDate = employee.contractStartDate || employee.dateOfHire;
        if (!startDate) continue;

        const employeeStartDate = new Date(startDate);
        employeeStartDate.setHours(0, 0, 0, 0);

        // ONB-013: Only provision on the exact start date (not before)
        if (employeeStartDate.getTime() === today.getTime()) {
          // Check if employee has onboarding with IT tasks
          try {
            const onboarding = await this.recruitmentService.getOnboardingByEmployeeId(
              (employee as any)._id.toString(),
            );

            if (onboarding && onboarding.tasks) {
              // ONB-013: Find IT tasks (SSO/email/tools) that are not completed
              const itTasks = onboarding.tasks.filter(
                (task: any) =>
                  task.department === 'IT' &&
                  task.status !== 'COMPLETED' &&
                  task.status !== 'completed',
              );

              // Provision IT tasks (SSO/email/tools) as per ONB-013
              if (itTasks.length > 0) {
                employeesToProvision.push({
                  employee,
                  onboarding,
                  itTasks,
                });
              }
            }
          } catch (error) {
            // No onboarding found - skip this employee
            continue;
          }
        }
      }

      // Auto-provision access for each employee
      for (const { employee, onboarding, itTasks } of employeesToProvision) {
        try {
          console.log(
            `[ONB-013] Auto-provisioning access for employee ${employee.employeeNumber} (start date: ${employee.contractStartDate || employee.dateOfHire})`,
          );

          // ONB-013: Provision IT tasks (SSO/email/tools/clock access)
          for (const task of itTasks) {
            const taskIndex = onboarding.tasks.findIndex(
              (t: any) =>
                t.name === task.name && t.department === task.department,
            );

            if (taskIndex >= 0) {
              await this.recruitmentService.provisionSystemAccess(
                (employee as any)._id.toString(),
                taskIndex,
              );
              console.log(
                `[ONB-013] ✅ Auto-provisioned IT access (SSO/email/tools): ${task.name} for ${employee.employeeNumber}`,
              );
            }
          }
        } catch (error) {
          console.error(
            `[ONB-013] ❌ Failed to auto-provision access for ${employee.employeeNumber}:`,
            error,
          );
        }
      }

      console.log(
        `[ONB-013] Auto-provisioned access for ${employeesToProvision.length} employee(s)`,
      );
    } catch (error) {
      console.error(
        '[ONB-013] Error in provisionAccessForNewEmployees:',
        error,
      );
    }
  }

  /**
   * ONB-013: Automatically revoke access for employees whose termination/end date is today
   */
  private async revokeAccessForTerminatedEmployees(today: Date) {
    try {
      // Find employees whose termination date or contractEndDate is today
      // and they are still ACTIVE (access not yet revoked)
      const employees = await this.employeeProfileService.findAll(
        {
          status: EmployeeStatus.ACTIVE, // Only active employees need revocation
        },
        undefined,
      );

      const employeesToRevoke: any[] = [];

      for (const employee of employees.data || []) {
        let shouldRevoke = false;
        let revocationReason = '';

        // Check termination date
        try {
          const termination = await this.terminationModel
            .findOne({
              employeeId: new Types.ObjectId((employee as any)._id.toString()),
              terminationDate: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Within today
              },
              status: TerminationStatus.APPROVED, // Only revoke for approved terminations
            })
            .lean()
            .exec();

          if (termination) {
            shouldRevoke = true;
            revocationReason = `Automatic revocation: Termination date reached (${termination.terminationDate})`;
          }
        } catch (error) {
          // Continue checking contract end date
        }

        // Check contract end date if no termination found
        if (!shouldRevoke && employee.contractEndDate) {
          const endDate = new Date(employee.contractEndDate);
          endDate.setHours(0, 0, 0, 0);

          if (endDate.getTime() === today.getTime()) {
            shouldRevoke = true;
            revocationReason = `Automatic revocation: Contract end date reached (${employee.contractEndDate})`;
          }
        }

        if (shouldRevoke) {
          employeesToRevoke.push({
            employee,
            reason: revocationReason,
          });
        }
      }

      // Auto-revoke access for each employee
      for (const { employee, reason } of employeesToRevoke) {
        try {
          console.log(
            `[ONB-013] Auto-revoking access for employee ${employee.employeeNumber}: ${reason}`,
          );

          await this.recruitmentService.revokeSystemAccess(
            {
              employeeId: employee.employeeNumber,
              reason: reason,
            },
            {
              id: 'SYSTEM',
              roles: [SystemRole.SYSTEM_ADMIN],
              employeeNumber: 'SYSTEM',
            },
          );

          console.log(
            `[ONB-013] ✅ Auto-revoked access for ${employee.employeeNumber}`,
          );
        } catch (error) {
          console.error(
            `[ONB-013] ❌ Failed to auto-revoke access for ${employee.employeeNumber}:`,
            error,
          );
        }
      }

      console.log(
        `[ONB-013] Auto-revoked access for ${employeesToRevoke.length} employee(s)`,
      );
    } catch (error) {
      console.error(
        '[ONB-013] Error in revokeAccessForTerminatedEmployees:',
        error,
      );
    }
  }

  /**
   * Manual trigger for testing purposes
   * Can be called via API endpoint for immediate execution
   */
  async triggerManualExecution() {
    console.log('[ONB-013] Manual trigger executed');
    await this.processScheduledAccessProvisioning();
    return {
      message: 'Scheduled access provisioning/revocation executed manually',
      timestamp: new Date().toISOString(),
    };
  }
}

