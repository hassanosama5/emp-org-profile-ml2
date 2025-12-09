import api from "../client";
import {
  ShiftType,
  CreateShiftTypeDto,
  Shift,
  CreateShiftDto,
  ShiftAssignment,
  AssignShiftToEmployeeDto,
  AssignShiftToDepartmentDto,
  AssignShiftToPositionDto,
  UpdateShiftAssignmentDto,
  ShiftAssignmentStatus,
} from "../../../types/time-management";

export const shiftScheduleApi = {
  // Shift Types
  getShiftTypes: async (active?: boolean): Promise<ShiftType[]> => {
    const params = active !== undefined ? `?active=${active}` : '';
    return await api.get(`/shift-schedule/shift/types${params}`);
  },

  getShiftTypeById: async (id: string): Promise<ShiftType> => {
    return await api.get(`/shift-schedule/shift/type/${id}`);
  },

  // Shifts
  getShifts: async (filters?: { active?: boolean; shiftType?: string }): Promise<Shift[]> => {
    const params = new URLSearchParams();
    if (filters?.active !== undefined) params.append('active', filters.active.toString());
    if (filters?.shiftType) params.append('shiftType', filters.shiftType);
    const query = params.toString();
    return await api.get(`/shift-schedule/shifts${query ? `?${query}` : ''}`);
  },

  getShiftById: async (id: string): Promise<Shift> => {
    return await api.get(`/shift-schedule/shift/${id}`);
  },

  // Shift Assignments
  assignShiftToEmployee: async (data: AssignShiftToEmployeeDto) => {
    return await api.post("/shift-schedule/shift/assign", data);
  },

  assignShiftToDepartment: async (data: AssignShiftToDepartmentDto) => {
    return await api.post("/shift-schedule/shift/assign/department", data);
  },

  assignShiftToPosition: async (data: AssignShiftToPositionDto) => {
    return await api.post("/shift-schedule/shift/assign/position", data);
  },

  getAllShiftAssignments: async (filters?: {
    status?: ShiftAssignmentStatus;
    employeeId?: string;
    departmentId?: string;
    positionId?: string;
    shiftId?: string;
  }): Promise<ShiftAssignment[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);
    if (filters?.departmentId) params.append('departmentId', filters.departmentId);
    if (filters?.positionId) params.append('positionId', filters.positionId);
    if (filters?.shiftId) params.append('shiftId', filters.shiftId);
    const query = params.toString();
    return await api.get(`/shift-schedule/shift/assignments${query ? `?${query}` : ''}`);
  },

  getShiftAssignmentById: async (id: string): Promise<ShiftAssignment> => {
    return await api.get(`/shift-schedule/shift/assignment/${id}`);
  },

  updateShiftAssignment: async (id: string, data: UpdateShiftAssignmentDto) => {
    return await api.put(`/shift-schedule/shift/assignment/${id}`, data);
  },

  renewShiftAssignment: async (data: { assignmentId: string; newEndDate: Date }) => {
    return await api.post("/shift-schedule/shift/assignment/renew", data);
  },

  cancelShiftAssignment: async (data: { assignmentId: string }) => {
    return await api.post("/shift-schedule/shift/assignment/cancel", data);
  },

  postponeShiftAssignment: async (data: { assignmentId: string; newStartDate: Date; newEndDate?: Date }) => {
    return await api.post("/shift-schedule/shift/assignment/postpone", data);
  },

  checkExpiredAssignments: async () => {
    return await api.post("/shift-schedule/shift/assignments/check-expired");
  },
};

