import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TimeManagementService } from './time-management.service';

/**
 * Sync Scheduler Service
 * 
 * Handles automatic daily synchronization of time management data
 * BR-TM-22: All time management data must sync daily with payroll, benefits, and leave modules
 * 
 * Runs daily at 2:00 AM to sync previous day's data
 */
@Injectable()
export class SyncSchedulerService {
  private readonly logger = new Logger(SyncSchedulerService.name);

  constructor(
    private readonly timeManagementService: TimeManagementService,
  ) {}

  /**
   * Daily sync job - runs at 2:00 AM every day
   * Syncs attendance, overtime, and penalty data with payroll and leave systems
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailySync() {
    try {
      this.logger.log('[SCHEDULED TASK] Starting daily time management data sync...');
      
      // Sync previous day's data
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const syncResult = await this.timeManagementService.syncTimeManagementData(
        {
          syncDate: yesterday,
          modules: ['payroll', 'leaves', 'benefits'],
        },
        'system', // System-initiated sync
      );

      this.logger.log(
        `[SCHEDULED TASK] Daily sync completed. Overall status: ${syncResult.overallStatus}. ` +
        `Payroll: ${syncResult.results?.payroll?.status || 'N/A'}, ` +
        `Leaves: ${syncResult.results?.leaves?.status || 'N/A'}, ` +
        `Benefits: ${syncResult.results?.benefits?.status || 'N/A'}`,
      );

      // Log any failures
      if (syncResult.results?.payroll?.status === 'FAILED') {
        this.logger.error(
          `[SCHEDULED TASK] Payroll sync failed: ${syncResult.results.payroll.error}`,
        );
      }
      if (syncResult.results?.leaves?.status === 'FAILED') {
        this.logger.error(
          `[SCHEDULED TASK] Leaves sync failed: ${syncResult.results.leaves.error}`,
        );
      }
      if (syncResult.results?.benefits?.status === 'FAILED') {
        this.logger.error(
          `[SCHEDULED TASK] Benefits sync failed: ${syncResult.results.benefits.error}`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `[SCHEDULED TASK] Daily sync failed: ${error.message}`,
        error.stack,
      );
    }
  }
}

