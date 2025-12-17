import api from "../client";
import {
  ShiftAssignment,
  AssignShiftToEmployeeDto,
  AssignShiftToDepartmentDto,
  AssignShiftToPositionDto,
  UpdateShiftAssignmentDto,
  ShiftAssignmentStatus,
  Shift,
  ShiftType,
} from "../../../types/time-management";

// ===== SHIFT TYPE INTERFACES =====
export interface CreateShiftTypeDto {
  name: string;
  active: boolean;
}

export interface UpdateShiftTypeDto {
  name: string;
  active: boolean;
}

// ===== SHIFT INTERFACES =====
export interface CreateShiftDto {
  name: string;
  shiftType: string; // ShiftType ID
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  punchPolicy: 'MULTIPLE' | 'FIRST_LAST' | 'ONLY_FIRST';
  graceInMinutes: number;
  graceOutMinutes: number;
  requiresApprovalForOvertime: boolean;
  active: boolean;
}

// Helper API functions for fetching dropdown options
export const fetchShiftTypes = async (activeOnly: boolean = true): Promise<ShiftType[]> => {
  const queryString = activeOnly ? '?active=true' : '';
  const response: any = await api.get(`/shift-schedule/shift/types${queryString}`);
  return Array.isArray(response) ? response : (response.data || response.shiftTypes || []);
};

export const fetchShifts = async (activeOnly: boolean = true): Promise<Shift[]> => {
  const queryString = activeOnly ? '?active=true' : '';
  const response: any = await api.get(`/shift-schedule/shifts${queryString}`);
  // Handle different response formats
  return Array.isArray(response) ? response : (response.data || response.shifts || []);
};

export const fetchDepartments = async (activeOnly: boolean = true): Promise<any[]> => {
  const queryString = activeOnly ? '?isActive=true' : '';
  const response: any = await api.get(`/organization-structure/departments${queryString}`);
  return Array.isArray(response) ? response : (response.data || response.departments || []);
};

export const fetchPositions = async (activeOnly: boolean = true, departmentId?: string): Promise<any[]> => {
  const params: string[] = [];
  if (activeOnly) params.push('isActive=true');
  if (departmentId) params.push(`departmentId=${departmentId}`);
  const queryString = params.length > 0 ? `?${params.join('&')}` : '';
  const response: any = await api.get(`/organization-structure/positions${queryString}`);
  return Array.isArray(response) ? response : (response.data || response.positions || []);
};

export const fetchEmployees = async (): Promise<any[]> => {
  const response = await api.get('/employee-profile');
  // Interceptor returns response.data directly, so response is already the data
  // Handle nested data structure if backend wraps it
  if (response && typeof response === "object" && "data" in response && Array.isArray((response as any).data)) {
    return (response as any).data;
  }
  if (Array.isArray(response)) {
    return response;
  }
  return [];
};

export const shiftScheduleApi = {
  // ===== SHIFT TYPE MANAGEMENT =====
  
  // POST create shift type
  createShiftType: async (data: CreateShiftTypeDto): Promise<ShiftType> => {
    return await api.post("/shift-schedule/shift/type", data);
  },
  
  // GET all shift types
  getShiftTypes: async (activeOnly?: boolean): Promise<ShiftType[]> => {
    const queryString = activeOnly !== undefined ? `?active=${activeOnly}` : '';
    const response: any = await api.get(`/shift-schedule/shift/types${queryString}`);
    return Array.isArray(response) ? response : (response.data || []);
  },
  
  // GET shift type by ID
  getShiftTypeById: async (id: string): Promise<ShiftType> => {
    return await api.get(`/shift-schedule/shift/type/${id}`);
  },
  
  // PUT update shift type
  updateShiftType: async (id: string, data: UpdateShiftTypeDto): Promise<ShiftType> => {
    return await api.put(`/shift-schedule/shift/type/${id}`, data);
  },
  
  // DELETE shift type
  deleteShiftType: async (id: string): Promise<void> => {
    return await api.delete(`/shift-schedule/shift/type/${id}`);
  },
  
  // ===== SHIFT MANAGEMENT =====
  
  // POST create shift
  createShift: async (data: CreateShiftDto): Promise<Shift> => {
    return await api.post("/shift-schedule/shift", data);
  },
  
  // GET all shifts
  getShifts: async (filters?: { active?: boolean; shiftType?: string }): Promise<Shift[]> => {
    const params = new URLSearchParams();
    if (filters?.active !== undefined) params.append('active', filters.active.toString());
    if (filters?.shiftType) params.append('shiftType', filters.shiftType);
    const queryString = params.toString();
    const response: any = await api.get(`/shift-schedule/shifts${queryString ? `?${queryString}` : ''}`);
    return Array.isArray(response) ? response : (response.data || []);
  },
  
  // GET shifts by type
  getShiftsByType: async (shiftTypeId: string): Promise<Shift[]> => {
    const response: any = await api.get(`/shift-schedule/shifts/type/${shiftTypeId}`);
    return Array.isArray(response) ? response : (response.data || []);
  },
  
  // GET shift by ID
  getShiftById: async (id: string): Promise<Shift> => {
    return await api.get(`/shift-schedule/shift/${id}`);
  },
  
  // PUT update shift
  updateShift: async (id: string, data: CreateShiftDto): Promise<Shift> => {
    return await api.put(`/shift-schedule/shift/${id}`, data);
  },
  
  // DELETE shift
  deleteShift: async (id: string): Promise<void> => {
    return await api.delete(`/shift-schedule/shift/${id}`);
  },
  
  // ===== SHIFT ASSIGNMENT MANAGEMENT =====
  
  // GET all assignments (to view/manage)
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
  
  // GET single assignment (to view details)
  getShiftAssignmentById: async (id: string): Promise<ShiftAssignment> => {
    return await api.get(`/shift-schedule/shift/assignment/${id}`);
  },
  
  // GET employee shift assignments
  getEmployeeShiftAssignments: async (employeeId: string): Promise<ShiftAssignment[]> => {
    const response: any = await api.get(`/shift-schedule/shift/assignments/employee/${employeeId}`);
    return Array.isArray(response) ? response : (response.data || []);
  },
  
  // GET department shift assignments
  getDepartmentShiftAssignments: async (departmentId: string): Promise<ShiftAssignment[]> => {
    const response: any = await api.get(`/shift-schedule/shift/assignments/department/${departmentId}`);
    return Array.isArray(response) ? response : (response.data || []);
  },
  
  // GET position shift assignments
  getPositionShiftAssignments: async (positionId: string): Promise<ShiftAssignment[]> => {
    const response: any = await api.get(`/shift-schedule/shift/assignments/position/${positionId}`);
    return Array.isArray(response) ? response : (response.data || []);
  },
  
  // POST assign to employee
  assignShiftToEmployee: async (data: AssignShiftToEmployeeDto): Promise<ShiftAssignment> => {
    return await api.post("/shift-schedule/shift/assign", data);
  },
  
  // POST assign to department
  assignShiftToDepartment: async (data: AssignShiftToDepartmentDto): Promise<any> => {
    return await api.post("/shift-schedule/shift/assign/department", data);
  },
  
  // POST assign to position
  assignShiftToPosition: async (data: AssignShiftToPositionDto): Promise<any> => {
    return await api.post("/shift-schedule/shift/assign/position", data);
  },
  
  // PUT update assignment
  updateShiftAssignment: async (id: string, data: UpdateShiftAssignmentDto): Promise<ShiftAssignment> => {
    return await api.put(`/shift-schedule/shift/assignment/${id}`, data);
  },
  
  // DELETE assignment (cancel)
  cancelShiftAssignment: async (id: string, reason?: string): Promise<void> => {
    return await api.post(`/shift-schedule/shift/assignment/${id}/cancel`, { reason });
  },

  // ===== SCHEDULE RULE MANAGEMENT (BR-TM-03) =====
  
  // POST create schedule rule
  createScheduleRule: async (data: CreateScheduleRuleDto): Promise<ScheduleRule> => {
    return await api.post("/shift-schedule/schedule", data);
  },
  
  // GET all schedule rules
  getScheduleRules: async (activeOnly?: boolean): Promise<ScheduleRule[]> => {
    const queryString = activeOnly !== undefined ? `?active=${activeOnly}` : '';
    const response: any = await api.get(`/shift-schedule/schedules${queryString}`);
    return Array.isArray(response) ? response : (response.data || []);
  },
  
  // GET schedule rule by ID
  getScheduleRuleById: async (id: string): Promise<ScheduleRule> => {
    return await api.get(`/shift-schedule/schedule/${id}`);
  },
  
  // PUT update schedule rule
  updateScheduleRule: async (id: string, data: UpdateScheduleRuleDto): Promise<ScheduleRule> => {
    return await api.put(`/shift-schedule/schedule/${id}`, data);
  },
  
  // DELETE schedule rule
  deleteScheduleRule: async (id: string): Promise<void> => {
    return await api.delete(`/shift-schedule/schedule/${id}`);
  },
};

// ===== SCHEDULE RULE INTERFACES =====
export interface ScheduleRule {
  _id: string;
  name: string;
  pattern: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateScheduleRuleDto {
  name: string;
  pattern: string;
  active: boolean;
}

export interface UpdateScheduleRuleDto {
  name: string;
  pattern: string;
  active: boolean;
}
