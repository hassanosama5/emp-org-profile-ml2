export interface User {
  id: string;
  userId?: string; // Alias for id
  employeeNumber?: string;
  candidateNumber?: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  workEmail?: string;
  personalEmail?: string;
  roles: string[];
  userType: 'employee' | 'candidate';
  username?: string; // From JWT payload
  permissions?: string[];
}

export interface LoginRequest {
  employeeNumber: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  nationalId: string;
  password: string;
  gender: string;
  maritalStatus: string;
  dateOfBirth: string;
  personalEmail: string;
  mobilePhone: string;
  homePhone?: string;
  address: string;
}

// Main response from your backend
export interface AuthApiResponse {
  message: string;
  access_token: string;
  user: User;
}

// For other API responses
export interface ApiResponse<T = any> {
  message: string;
  data?: T;
  success?: boolean;
  error?: string;
}

// For login/register specifically
export interface AuthResponse {
  access_token: string;
  user: User;
}

export enum SystemRole {
  DEPARTMENT_EMPLOYEE = 'department employee',
  DEPARTMENT_HEAD = 'department head',
  HR_MANAGER = 'HR Manager',
  HR_EMPLOYEE = 'HR Employee',
  PAYROLL_SPECIALIST = 'Payroll Specialist',
  PAYROLL_MANAGER = 'Payroll Manager',
  SYSTEM_ADMIN = 'System Admin',
  LEGAL_POLICY_ADMIN = 'Legal & Policy Admin',
  RECRUITER = 'Recruiter',
  FINANCE_STAFF = 'Finance Staff',
  JOB_CANDIDATE = 'Job Candidate',
  HR_ADMIN = 'HR Admin',
}

// JWT payload from your backend
export interface JwtPayload {
  username: string;
  sub: string;
  roles: string[];
  permissions: string[];
  userType: 'employee' | 'candidate';
  iat?: number;
  exp?: number;
}
