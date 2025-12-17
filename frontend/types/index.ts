// Update your existing types/index.ts with these additions:

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ApiResponse<T = any> {
  message: string;
  data?: T;
  success?: boolean;
  error?: string;
}

// Update EmployeeProfile to match your backend schema
export interface EmployeeProfile {
  id: string;
  _id?: string; // MongoDB ID
  employeeNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string; // ✅ Add this - it's in your schema
  nationalId: string;
  gender?: "MALE" | "FEMALE";
  dateOfBirth?: string;
  personalEmail?: string;
  workEmail?: string;
  mobilePhone?: string;
  homePhone?: string;
  address?: {
    city?: string;
    streetAddress?: string;
    country?: string;
  };
  profilePictureUrl?: string;
  dateOfHire: string;
  biography?: string;
  contractType?: "FULL_TIME_CONTRACT" | "PART_TIME_CONTRACT";
  workType?: "FULL_TIME" | "PART_TIME";
  status:
    | "ACTIVE"
    | "INACTIVE"
    | "ON_LEAVE"
    | "SUSPENDED"
    | "RETIRED"
    | "PROBATION"
    | "TERMINATED";
  maritalStatus?: "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED";

  // MongoDB ObjectId fields (as strings)
  primaryPositionId?: string;
  primaryDepartmentId?: string;
  supervisorPositionId?: string;
  payGradeId?: string;

  // Populated fields (from refs)
  primaryPosition?: {
    id: string;
    title: string;
    code: string;
  };
  primaryDepartment?: {
    id: string;
    name: string;
    code: string;
  };
  supervisor?: {
    id: string;
    fullName: string;
    employeeNumber: string;
  };
  payGrade?: {
    id: string;
    name: string;
    level: number;
  };

  // Audit fields
  createdAt?: string;
  updatedAt?: string;
}

// Update ProfileChangeRequest to match your backend schema
export interface ProfileChangeRequest {
  id: string;
  _id?: string; // MongoDB ID
  requestId: string;
  employeeProfileId: string;
  employee?: {
    fullName: string;
    employeeNumber: string;
  };
  requestDescription: string; // ✅ Fixed: This is the actual field name from schema
  reason?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";
  submittedAt: string;
  processedAt?: string;
  // Note: No requestedChanges in your schema - it's requestDescription instead
}

// Update TeamMember interface
export interface TeamMember {
  id: string;
  employeeNumber: string;
  fullName: string;
  firstName: string;
  lastName: string;
  positionTitle: string;
  departmentName: string;
  status: string;
  dateOfHire: string;
  workEmail?: string;
  mobilePhone?: string;
  profilePictureUrl?: string; // ADD THIS LINE
}

// Update Profile DTO - based on your backend DTOs
export interface UpdateProfileDto {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: "MALE" | "FEMALE";
  dateOfBirth?: string;
  personalEmail?: string;
  mobilePhone?: string;
  homePhone?: string;
  address?: {
    city?: string;
    streetAddress?: string;
    country?: string;
  };
  profilePictureUrl?: string;
  biography?: string;
  maritalStatus?: "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED";
}

// types/index.ts - Add this if missing
export enum SystemRole {
  DEPARTMENT_EMPLOYEE = "department employee",
  DEPARTMENT_HEAD = "department head",
  HR_MANAGER = "HR Manager",
  HR_EMPLOYEE = "HR Employee",
  PAYROLL_SPECIALIST = "Payroll Specialist",
  PAYROLL_MANAGER = "Payroll Manager",
  SYSTEM_ADMIN = "System Admin",
  LEGAL_POLICY_ADMIN = "Legal & Policy Admin",
  RECRUITER = "Recruiter",
  FINANCE_STAFF = "Finance Staff",
  JOB_CANDIDATE = "Job Candidate",
  HR_ADMIN = "HR Admin",
}

export interface User {
  id: string;
  userId?: string;
  employeeNumber?: string;
  candidateNumber?: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  workEmail?: string;
  personalEmail?: string;
  roles: string[];
  userType: "employee" | "candidate";
  username?: string;
  permissions?: string[];
  profilePictureUrl?: string; // ADD THIS
}

// Add the rest of your existing types...

export interface LoginRequest {
  employeeNumber: string;
  password: string;
}

// Candidate interface for Talent Pool
export interface Candidate {
  _id: string;
  candidateNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName?: string;
  personalEmail?: string;
  mobilePhone?: string;
  nationalId?: string;
  gender?: "MALE" | "FEMALE";
  dateOfBirth?: string;
  address?: {
    city?: string;
    streetAddress?: string;
    country?: string;
  };
  resumeUrl?: string;
  status: "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER_SENT" | "OFFER_ACCEPTED" | "HIRED" | "REJECTED" | "WITHDRAWN";
  applicationDate?: string;
  notes?: string;
  departmentId?: string | { _id: string; name: string; code: string };
  positionId?: string | { _id: string; title: string; code: string };
  department?: { _id: string; name: string; code: string };
  position?: { _id: string; title: string; code: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterRequest {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  nationalId: string;
  personalEmail: string;
  password: string;
  gender?: "MALE" | "FEMALE";
  maritalStatus?: "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED";
  dateOfBirth?: string;
  mobilePhone?: string;
  homePhone?: string;
  address?: {
    city?: string;
    streetAddress?: string;
    country?: string;
  };
  departmentId?: string;
  positionId?: string;
  resumeUrl?: string;
  notes?: string;
  userType?: "employee" | "candidate";
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface AuthApiResponse {
  message?: string;
  access_token?: string;
  user?: User;
  data?: unknown;
  success?: boolean;
  error?: string;
}

export interface ChangeRequestInput {
  requestDescription?: string;
  reason?: string;
  subject?: string;
  details?: string;
}

// Add these enums to your existing types/index.ts file

export enum ContractType {
  FULL_TIME_CONTRACT = "FULL_TIME_CONTRACT",
  PART_TIME_CONTRACT = "PART_TIME_CONTRACT",
}

export enum WorkType {
  FULL_TIME = "FULL_TIME",
  PART_TIME = "PART_TIME",
}

export enum EmployeeStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ON_LEAVE = "ON_LEAVE",
  SUSPENDED = "SUSPENDED",
  RETIRED = "RETIRED",
  PROBATION = "PROBATION",
  TERMINATED = "TERMINATED",
}

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
}

export enum MaritalStatus {
  SINGLE = "SINGLE",
  MARRIED = "MARRIED",
  DIVORCED = "DIVORCED",
  WIDOWED = "WIDOWED",
}

export interface EmployeeQualification {
  id: string;
  _id?: string;
  employeeProfileId: string;
  establishmentName: string;
  graduationType: GraduationType | string;
  createdAt?: string;
  updatedAt?: string;
}

export enum GraduationType {
  UNDERGRADE = "UNDERGRADE",
  BACHELOR = "BACHELOR",
  MASTER = "MASTER",
  PHD = "PHD",
  OTHER = "OTHER",
}

// Add to existing types
export interface CreateQualificationDto {
  establishmentName: string;
  graduationType: string;
}

export interface UpdateQualificationDto {
  establishmentName?: string;
  graduationType?: string;
}
