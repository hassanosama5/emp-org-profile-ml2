// Main organization-structure API exports
import { departmentsApi } from "./departments.api";
import { positionsApi } from "./positions.api";
import { changeRequestsApi } from "./change-requests.api";
import { approvalsApi } from "./approvals.api";
import { positionAssignmentsApi } from "./position-assignments.api";
import { changeLogsApi } from "./change-logs.api";

export const organizationStructureApi = {
  departments: departmentsApi,
  positions: positionsApi,
  changeRequests: changeRequestsApi,
  approvals: approvalsApi,
  positionAssignments: positionAssignmentsApi,
  changeLogs: changeLogsApi,
};

// Also export individual APIs for flexibility
export {
  departmentsApi,
  positionsApi,
  changeRequestsApi,
  approvalsApi,
  positionAssignmentsApi,
  changeLogsApi,
};
