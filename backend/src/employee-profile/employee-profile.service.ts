// src/employee-profile/employee-profile.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import {
  EmployeeProfile,
  EmployeeProfileDocument,
} from './models/employee-profile.schema';
import { EmployeeProfileChangeRequest } from './models/ep-change-request.schema';
import { Candidate, CandidateDocument } from './models/candidate.schema';
import { EmployeeSystemRole } from './models/employee-system-role.schema';
import { EmployeeQualification } from './models/qualification.schema';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  UpdateEmployeeSelfServiceDto,
  QueryEmployeeDto,
  CreateCandidateDto,
  UpdateCandidateDto,
  CreateProfileChangeRequestDto,
  ProcessProfileChangeRequestDto,
} from './dto';
import {
  EmployeeStatus,
  SystemRole,
  CandidateStatus,
  ProfileChangeStatus,
  GraduationType,
} from './enums/employee-profile.enums';

import { RegisterCandidateDto } from './dto/register-candidate.dto';

@Injectable()
export class EmployeeProfileService {
  constructor(
    @InjectModel(EmployeeProfile.name)
    private employeeModel: Model<EmployeeProfileDocument>,
    @InjectModel(Candidate.name)
    private candidateModel: Model<CandidateDocument>,
    @InjectModel(EmployeeProfileChangeRequest.name)
    private changeRequestModel: Model<EmployeeProfileChangeRequest>,
    @InjectModel(EmployeeSystemRole.name)
    private systemRoleModel: Model<EmployeeSystemRole>,
    @InjectModel(EmployeeQualification.name)
    private qualificationModel: Model<EmployeeQualification>,
  ) {}

  // ==================== EMPLOYEE CRUD ====================

  async create(createEmployeeDto: CreateEmployeeDto): Promise<EmployeeProfile> {
    // Check for duplicate national ID
    const existingEmployee = await this.employeeModel
      .findOne({ nationalId: createEmployeeDto.nationalId })
      .exec();

    if (existingEmployee) {
      throw new ConflictException(
        'Employee with this National ID already exists',
      );
    }

    // Generate employee number
    const employeeNumber = await this.generateEmployeeNumber();

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (createEmployeeDto.password) {
      hashedPassword = await bcrypt.hash(createEmployeeDto.password, 10);
    }

    // Create full name
    const fullName = [
      createEmployeeDto.firstName,
      createEmployeeDto.middleName,
      createEmployeeDto.lastName,
    ]
      .filter(Boolean)
      .join(' ');

    const employee = new this.employeeModel({
      ...createEmployeeDto,
      employeeNumber,
      fullName,
      password: hashedPassword,
      status: createEmployeeDto.status || EmployeeStatus.PROBATION,
      statusEffectiveFrom: new Date(),
    });

    const savedEmployee = await employee.save();

    // Create default system role
    await this.systemRoleModel.create({
      employeeProfileId: savedEmployee._id,
      roles: [SystemRole.DEPARTMENT_EMPLOYEE],
      isActive: true,
    });

    return savedEmployee;
  }

  async findAll(query: QueryEmployeeDto, currentUserId?: string) {
    const {
      search,
      departmentId,
      positionId,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: any = {};

    // Search across multiple fields
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { employeeNumber: { $regex: search, $options: 'i' } },
        { workEmail: { $regex: search, $options: 'i' } },
      ];
    }

    if (departmentId) {
      filter.primaryDepartmentId = new Types.ObjectId(departmentId);
    }

    if (positionId) {
      filter.primaryPositionId = new Types.ObjectId(positionId);
    }

    if (status) {
      filter.status = status;
    }

    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [employees, total] = await Promise.all([
      this.employeeModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('primaryDepartmentId', 'name code')
        .populate('primaryPositionId', 'title code')
        .populate('supervisorPositionId', 'title code')
        .populate('payGradeId', 'grade grossSalary')
        .select('-password')
        .lean()
        .exec(),
      this.employeeModel.countDocuments(filter).exec(),
    ]);

    return {
      data: employees,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<EmployeeProfile> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid employee ID');
    }

    const employee = await this.employeeModel
      .findById(id)
      .populate('primaryDepartmentId', 'name code description')
      .populate('primaryPositionId', 'title code description')
      .populate('supervisorPositionId', 'title code')
      .populate('payGradeId', 'grade baseSalary grossSalary')
      .populate('lastAppraisalRecordId')
      .populate('accessProfileId')
      .select('-password')
      .exec();

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  async findByEmployeeNumber(employeeNumber: string): Promise<EmployeeProfile> {
    const employee = await this.employeeModel
      .findOne({ employeeNumber })
      .select('-password')
      .exec();

    if (!employee) {
      throw new NotFoundException(
        `Employee with number ${employeeNumber} not found`,
      );
    }

    return employee;
  }

  async findByNationalId(nationalId: string): Promise<EmployeeProfile> {
    const employee = await this.employeeModel
      .findOne({ nationalId })
      .select('-password')
      .exec();

    if (!employee) {
      throw new NotFoundException(
        `Employee with national ID ${nationalId} not found`,
      );
    }

    return employee;
  }

  async update(
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
  ): Promise<EmployeeProfile> {
    const employee = await this.findOne(id);

    // Update full name if name fields changed
    if (
      updateEmployeeDto.firstName ||
      updateEmployeeDto.middleName ||
      updateEmployeeDto.lastName
    ) {
      const fullName = [
        updateEmployeeDto.firstName || employee.firstName,
        updateEmployeeDto.middleName || employee.middleName,
        updateEmployeeDto.lastName || employee.lastName,
      ]
        .filter(Boolean)
        .join(' ');
      updateEmployeeDto['fullName'] = fullName;
    }

    // Update status effective date if status changed
    if (
      updateEmployeeDto.status &&
      updateEmployeeDto.status !== employee.status
    ) {
      updateEmployeeDto['statusEffectiveFrom'] = new Date();
    }

    const updatedEmployee = await this.employeeModel
      .findByIdAndUpdate(id, { $set: updateEmployeeDto }, { new: true })
      .select('-password')
      .exec();

    return updatedEmployee;
  }

  async updateSelfService(
    id: string,
    updateDto: UpdateEmployeeSelfServiceDto,
  ): Promise<EmployeeProfile> {
    await this.findOne(id);

    const updatedEmployee = await this.employeeModel
      .findByIdAndUpdate(id, { $set: updateDto }, { new: true })
      .select('-password')
      .exec();

    return updatedEmployee;
  }

  async updateBankingInfo(
    id: string,
    bankingData: { bankName?: string; bankAccountNumber?: string },
  ): Promise<EmployeeProfile> {
    await this.findOne(id);

    const updatedEmployee = await this.employeeModel
      .findByIdAndUpdate(id, { $set: bankingData }, { new: true })
      .select('-password')
      .exec();

    return updatedEmployee;
  }

  async updateBiography(
    id: string,
    biography: string,
  ): Promise<EmployeeProfile> {
    await this.findOne(id);

    const updatedEmployee = await this.employeeModel
      .findByIdAndUpdate(id, { $set: { biography } }, { new: true })
      .select('-password')
      .exec();

    return updatedEmployee;
  }

  async uploadProfilePhoto(
    id: string,
    photo: Express.Multer.File,
  ): Promise<string> {
    await this.findOne(id);

    // In a real application, you would upload to cloud storage (AWS S3, Cloudinary, etc.)
    // For now, we'll simulate returning a URL
    const profilePictureUrl = `https://storage.example.com/profiles/${id}/photo.jpg`;

    await this.employeeModel
      .findByIdAndUpdate(id, { $set: { profilePictureUrl } }, { new: true })
      .exec();

    return profilePictureUrl;
  }

  async remove(id: string): Promise<void> {
    const employee = await this.findOne(id);

    // Soft delete: change status to TERMINATED
    await this.employeeModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: EmployeeStatus.TERMINATED,
            statusEffectiveFrom: new Date(),
          },
        },
        { new: true },
      )
      .exec();
  }

  // ==================== SYSTEM ROLE MANAGEMENT ====================

  async assignSystemRoles(
    employeeId: string,
    roles: SystemRole[],
    permissions: string[] = [],
  ): Promise<EmployeeSystemRole> {
    await this.findOne(employeeId);

    const existingRole = await this.systemRoleModel
      .findOne({ employeeProfileId: new Types.ObjectId(employeeId) })
      .exec();

    if (existingRole) {
      existingRole.roles = roles;
      existingRole.permissions = permissions;
      existingRole.isActive = true;
      return existingRole.save();
    }

    return this.systemRoleModel.create({
      employeeProfileId: new Types.ObjectId(employeeId),
      roles,
      permissions,
      isActive: true,
    });
  }

  async getSystemRoles(employeeId: string): Promise<EmployeeSystemRole | null> {
    return this.systemRoleModel
      .findOne({ employeeProfileId: new Types.ObjectId(employeeId) })
      .exec();
  }

  async updateSystemRoles(
    employeeId: string,
    roles?: SystemRole[],
    permissions?: string[],
  ): Promise<EmployeeSystemRole> {
    await this.findOne(employeeId);

    const existingRole = await this.systemRoleModel
      .findOne({ employeeProfileId: new Types.ObjectId(employeeId) })
      .exec();

    if (!existingRole) {
      throw new NotFoundException('System roles not found for employee');
    }

    const updateData: any = {};
    if (roles) updateData.roles = roles;
    if (permissions) updateData.permissions = permissions;

    const updatedRole = await this.systemRoleModel
      .findOneAndUpdate(
        { employeeProfileId: new Types.ObjectId(employeeId) },
        { $set: updateData },
        { new: true },
      )
      .exec();

    if (!updatedRole) {
      throw new NotFoundException('Failed to update system roles');
    }

    return updatedRole;
  }

  async deactivateSystemRoles(employeeId: string): Promise<void> {
    await this.findOne(employeeId);

    const result = await this.systemRoleModel
      .updateOne(
        { employeeProfileId: new Types.ObjectId(employeeId) },
        { $set: { isActive: false } },
      )
      .exec();

    if (result.modifiedCount === 0) {
      throw new NotFoundException('System roles not found for employee');
    }
  }

  // ==================== CANDIDATE MANAGEMENT ====================

  async createCandidate(
    createCandidateDto: CreateCandidateDto,
  ): Promise<Candidate> {
    // Check for duplicate national ID
    const existingCandidate = await this.candidateModel
      .findOne({ nationalId: createCandidateDto.nationalId })
      .exec();

    if (existingCandidate) {
      throw new ConflictException(
        'Candidate with this National ID already exists',
      );
    }

    // Generate candidate number
    const candidateNumber = await this.generateCandidateNumber();

    // Create full name
    const fullName = [
      createCandidateDto.firstName,
      createCandidateDto.middleName,
      createCandidateDto.lastName,
    ]
      .filter(Boolean)
      .join(' ');

    const candidate = new this.candidateModel({
      ...createCandidateDto,
      candidateNumber,
      fullName,
      status: CandidateStatus.APPLIED,
      applicationDate: new Date(),
    });

    return candidate.save();
  }

  async findAllCandidates(): Promise<Candidate[]> {
    return this.candidateModel
      .find()
      .populate('departmentId', 'name code')
      .populate('positionId', 'title code')
      .exec();
  }

  async findAllCandidatesWithFilters(query: any): Promise<Candidate[]> {
    const filter: any = {};

    if (query.status) {
      filter.status = query.status;
    }

    if (query.departmentId) {
      filter.departmentId = new Types.ObjectId(query.departmentId);
    }

    if (query.positionId) {
      filter.positionId = new Types.ObjectId(query.positionId);
    }

    if (query.search) {
      filter.$or = [
        { firstName: { $regex: query.search, $options: 'i' } },
        { lastName: { $regex: query.search, $options: 'i' } },
        { candidateNumber: { $regex: query.search, $options: 'i' } },
        { personalEmail: { $regex: query.search, $options: 'i' } },
      ];
    }

    return this.candidateModel
      .find(filter)
      .populate('departmentId', 'name code')
      .populate('positionId', 'title code')
      .exec();
  }

  async findCandidateById(id: string): Promise<Candidate> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid candidate ID');
    }

    const candidate = await this.candidateModel
      .findById(id)
      .populate('departmentId', 'name code')
      .populate('positionId', 'title code')
      .exec();

    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }

    return candidate;
  }

  async findCandidatesByStatus(status: string): Promise<Candidate[]> {
    return this.candidateModel
      .find({ status })
      .populate('departmentId', 'name code')
      .populate('positionId', 'title code')
      .exec();
  }

  async updateCandidate(
    id: string,
    updateCandidateDto: UpdateCandidateDto,
  ): Promise<Candidate> {
    const candidate = await this.findCandidateById(id);

    // Update full name if name fields changed
    if (
      updateCandidateDto.firstName ||
      updateCandidateDto.middleName ||
      updateCandidateDto.lastName
    ) {
      const fullName = [
        updateCandidateDto.firstName || candidate.firstName,
        updateCandidateDto.middleName || candidate.middleName,
        updateCandidateDto.lastName || candidate.lastName,
      ]
        .filter(Boolean)
        .join(' ');
      updateCandidateDto['fullName'] = fullName;
    }

    const updatedCandidate = await this.candidateModel
      .findByIdAndUpdate(id, { $set: updateCandidateDto }, { new: true })
      .exec();

    return updatedCandidate;
  }

  async updateCandidateStatus(
    id: string,
    status: CandidateStatus,
  ): Promise<Candidate> {
    const candidate = await this.findCandidateById(id);

    const updatedCandidate = await this.candidateModel
      .findByIdAndUpdate(id, { $set: { status } }, { new: true })
      .exec();

    return updatedCandidate;
  }

  async removeCandidate(id: string): Promise<void> {
    const candidate = await this.findCandidateById(id);
    await this.candidateModel.findByIdAndDelete(id).exec();
  }

  async convertCandidateToEmployee(
    candidateId: string,
    employeeData: {
      workEmail: string;
      dateOfHire: Date;
      contractType: string;
      workType: string;
      password?: string;
      primaryDepartmentId?: string;
      primaryPositionId?: string;
    },
  ): Promise<EmployeeProfile> {
    if (!employeeData?.workEmail) {
      throw new BadRequestException('workEmail is required in request body');
    }

    if (!employeeData?.dateOfHire) {
      throw new BadRequestException('dateOfHire is required in request body');
    }

    if (!employeeData?.contractType) {
      throw new BadRequestException('contractType is required in request body');
    }

    if (!employeeData?.workType) {
      throw new BadRequestException('workType is required in request body');
    }

    const candidate = await this.findCandidateById(candidateId);

    const createEmployeeDto: CreateEmployeeDto = {
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      middleName: candidate.middleName,
      nationalId: candidate.nationalId,
      gender: candidate.gender,
      dateOfBirth: candidate.dateOfBirth,
      personalEmail: candidate.personalEmail,
      mobilePhone: candidate.mobilePhone,
      workEmail: employeeData.workEmail,
      dateOfHire: employeeData.dateOfHire,
      contractType: employeeData.contractType as any,
      workType: employeeData.workType as any,
      status: EmployeeStatus.PROBATION,
      primaryDepartmentId:
        employeeData.primaryDepartmentId || candidate.departmentId?.toString(),
      primaryPositionId:
        employeeData.primaryPositionId || candidate.positionId?.toString(),
      password: employeeData.password,
    };

    const employee = await this.create(createEmployeeDto);

    await this.candidateModel
      .findByIdAndUpdate(candidateId, {
        $set: {
          status: CandidateStatus.HIRED,
        },
      })
      .exec();

    return employee;
  }

  // ==================== PROFILE CHANGE REQUEST MANAGEMENT ====================

  async createProfileChangeRequest(
    employeeId: string,
    createRequestDto: CreateProfileChangeRequestDto,
  ): Promise<EmployeeProfileChangeRequest> {
    await this.findOne(employeeId);

    const requestId = await this.generateChangeRequestId();

    const changeRequest = new this.changeRequestModel({
      requestId,
      employeeProfileId: new Types.ObjectId(employeeId),
      requestDescription: createRequestDto.requestDescription,
      reason: createRequestDto.reason,
      status: ProfileChangeStatus.PENDING,
      submittedAt: new Date(),
    });

    return changeRequest.save();
  }

  async getProfileChangeRequestsByEmployee(
    employeeId: string,
  ): Promise<EmployeeProfileChangeRequest[]> {
    return this.changeRequestModel
      .find({ employeeProfileId: new Types.ObjectId(employeeId) })
      .sort({ submittedAt: -1 })
      .exec();
  }

  async getAllProfileChangeRequests(
    status?: string,
  ): Promise<EmployeeProfileChangeRequest[]> {
    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    return this.changeRequestModel
      .find(filter)
      .populate('employeeProfileId', 'firstName lastName employeeNumber')
      .sort({ submittedAt: -1 })
      .exec();
  }

  async getAllProfileChangeRequestsWithFilters(
    query: any,
  ): Promise<EmployeeProfileChangeRequest[]> {
    const filter: any = {};

    if (query.status) {
      filter.status = query.status;
    }

    // FIXED: Handle empty string properly
    const employeeId = query.employeeId;

    // Check if employeeId exists and is a non-empty string
    if (
      employeeId &&
      typeof employeeId === 'string' &&
      employeeId.trim() !== ''
    ) {
      const trimmedId = employeeId.trim();

      // Only add to filter if it's a valid MongoDB ObjectId
      if (Types.ObjectId.isValid(trimmedId)) {
        filter.employeeProfileId = new Types.ObjectId(trimmedId);
      } else {
        // If it's not a valid ObjectId, DO NOT add to filter
        // This allows HR Admin to see all requests
        console.log(
          `⚠️ Invalid employeeId format: "${trimmedId}", skipping employee filter`,
        );
      }
    }
    // If employeeId is undefined, null, empty string, or invalid - don't filter by employee

    if (query.startDate) {
      filter.submittedAt = { $gte: new Date(query.startDate) };
    }

    if (query.endDate) {
      filter.submittedAt = {
        ...filter.submittedAt,
        $lte: new Date(query.endDate),
      };
    }

    console.log('🔍 Final MongoDB filter:', JSON.stringify(filter, null, 2));

    return this.changeRequestModel
      .find(filter)
      .populate('employeeProfileId', 'firstName lastName employeeNumber')
      .sort({ submittedAt: -1 })
      .exec();
  }

  async getProfileChangeRequestById(
    id: string,
  ): Promise<EmployeeProfileChangeRequest> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid change request ID');
    }

    const request = await this.changeRequestModel
      .findById(id)
      .populate('employeeProfileId', 'firstName lastName employeeNumber')
      .exec();

    if (!request) {
      throw new NotFoundException(`Change request with ID ${id} not found`);
    }

    return request;
  }

  async processProfileChangeRequest(
    id: string,
    processDto: ProcessProfileChangeRequestDto,
  ): Promise<EmployeeProfileChangeRequest> {
    const request = await this.getProfileChangeRequestById(id);

    if (request.status !== ProfileChangeStatus.PENDING) {
      throw new BadRequestException(
        'Only pending change requests can be processed',
      );
    }

    const updatedRequest = await this.changeRequestModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: processDto.status as ProfileChangeStatus,
            reason: processDto.reason,
            processedAt: new Date(),
          },
        },
        { new: true },
      )
      .populate('employeeProfileId', 'firstName lastName employeeNumber')
      .exec();

    if (!updatedRequest) {
      throw new NotFoundException('Change request not found after update');
    }

    if (updatedRequest.status === ProfileChangeStatus.APPROVED) {
      try {
        const raw = request.requestDescription || '';
        console.log('🔍 Raw request description:', raw);

        let payload: any = null;
        if (typeof raw === 'string' && raw.trim().startsWith('{')) {
          try {
            payload = JSON.parse(raw.trim());
            console.log('✅ Parsed payload:', payload);
          } catch (parseError: any) {
            // Add type annotation
            console.error('❌ JSON parse error:', parseError.message);
            console.error('❌ Raw string:', raw);
            payload = null;
          }
        } else {
          console.log('⚠️ Request description is not JSON or empty');
        }

        if (payload && payload.type && payload.changes) {
          console.log('📝 Payload has type:', payload.type);
          console.log('📝 Payload changes:', payload.changes);

          const allowedFields = [
            'firstName',
            'middleName',
            'lastName',
            'nationalId',
            'maritalStatus',
            'primaryPositionId',
            'primaryDepartmentId',
          ];

          const changes: Record<string, any> = {};
          for (const key of Object.keys(payload.changes)) {
            if (allowedFields.includes(key)) {
              changes[key] = payload.changes[key];
              console.log(
                `✅ Adding allowed field "${key}": ${payload.changes[key]}`,
              );
            } else {
              console.log(`⚠️ Skipping non-allowed field "${key}"`);
            }
          }

          console.log('📋 Final changes to apply:', changes);

          if (Object.keys(changes).length > 0) {
            const employeeId =
              (updatedRequest.employeeProfileId as any)?._id?.toString() ||
              (updatedRequest.employeeProfileId as any)?.toString();

            console.log('👤 Employee ID to update:', employeeId);

            if (employeeId) {
              // Validate specific fields before applying
              if (typeof changes.nationalId === 'string') {
                const validNat = /^[0-9]{14}$/.test(changes.nationalId);
                if (!validNat) {
                  console.log(
                    `❌ Invalid national ID format: ${changes.nationalId}`,
                  );
                  delete changes.nationalId;
                }
              }

              if (typeof changes.maritalStatus === 'string') {
                const allowedStatuses = [
                  'SINGLE',
                  'MARRIED',
                  'DIVORCED',
                  'WIDOWED',
                ];
                if (!allowedStatuses.includes(changes.maritalStatus)) {
                  console.log(
                    `❌ Invalid marital status: ${changes.maritalStatus}`,
                  );
                  delete changes.maritalStatus;
                }
              }

              if (typeof changes.primaryPositionId === 'string') {
                if (!Types.ObjectId.isValid(changes.primaryPositionId)) {
                  console.log(
                    `❌ Invalid position ID: ${changes.primaryPositionId}`,
                  );
                  delete changes.primaryPositionId;
                }
              }

              if (typeof changes.primaryDepartmentId === 'string') {
                if (!Types.ObjectId.isValid(changes.primaryDepartmentId)) {
                  console.log(
                    `❌ Invalid department ID: ${changes.primaryDepartmentId}`,
                  );
                  delete changes.primaryDepartmentId;
                }
              }

              const nameChanged =
                changes.firstName !== undefined ||
                changes.middleName !== undefined ||
                changes.lastName !== undefined;

              if (nameChanged) {
                console.log('👥 Name change detected');
                const current = await this.employeeModel
                  .findById(employeeId)
                  .select('firstName middleName lastName')
                  .lean()
                  .exec();

                console.log('📄 Current name:', current);

                const fullName = [
                  (changes.firstName ?? current?.firstName) as
                    | string
                    | undefined,
                  (changes.middleName ?? current?.middleName) as
                    | string
                    | undefined,
                  (changes.lastName ?? current?.lastName) as string | undefined,
                ]
                  .filter(Boolean)
                  .join(' ');

                changes['fullName'] = fullName;
                console.log('📝 New full name:', fullName);
              }

              console.log('🔄 Applying changes to employee:', employeeId);
              console.log('📄 Final changes object:', changes);

              // Apply the changes
              const updatedEmployee = await this.employeeModel
                .findByIdAndUpdate(employeeId, { $set: changes }, { new: true })
                .select('-password')
                .exec();

              if (updatedEmployee) {
                console.log('✅ Employee updated successfully!');
                console.log('📄 Updated employee:', {
                  id: updatedEmployee._id,
                  firstName: updatedEmployee.firstName,
                  lastName: updatedEmployee.lastName,
                  fullName: updatedEmployee.fullName,
                });
              } else {
                console.log('❌ Employee not found or update failed');
              }
            } else {
              console.log('❌ No employee ID found');
            }
          } else {
            console.log('⚠️ No allowed fields to update after filtering');
          }
        } else {
          console.log('⚠️ No valid payload or changes found');
        }
      } catch (error: any) {
        // Add type annotation
        // DON'T SILENTLY IGNORE! Log the error
        console.error('❌ ERROR applying profile changes:');
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        // Re-throw or handle as needed
        throw new BadRequestException(
          `Failed to apply changes: ${error.message}`,
        );
      }
    }

    return updatedRequest;
  }

  async cancelProfileChangeRequest(
    id: string,
    employeeId: string,
  ): Promise<EmployeeProfileChangeRequest> {
    const request = await this.getProfileChangeRequestById(id);

    // Check if the request belongs to the employee
    if (request.employeeProfileId.toString() !== employeeId.toString()) {
      throw new ForbiddenException(
        'You are not authorized to cancel this change request',
      );
    }

    if (request.status !== ProfileChangeStatus.PENDING) {
      throw new BadRequestException(
        'Only pending change requests can be cancelled',
      );
    }

    const updatedRequest = await this.changeRequestModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: ProfileChangeStatus.CANCELED,
            processedAt: new Date(),
          },
        },
        { new: true },
      )
      .exec();

    if (!updatedRequest) {
      throw new NotFoundException('Change request not found after update');
    }

    return updatedRequest;
  }

  // ==================== QUALIFICATION MANAGEMENT ====================

  async addQualification(
    employeeId: string,
    qualificationData: {
      establishmentName: string;
      graduationType: string;
    },
  ): Promise<EmployeeQualification> {
    await this.findOne(employeeId);

    const qualification = new this.qualificationModel({
      employeeProfileId: new Types.ObjectId(employeeId),
      establishmentName: qualificationData.establishmentName,
      graduationType: qualificationData.graduationType as GraduationType,
    });

    return qualification.save();
  }

  async getQualificationsByEmployee(
    employeeId: string,
  ): Promise<EmployeeQualification[]> {
    return this.qualificationModel
      .find({ employeeProfileId: new Types.ObjectId(employeeId) })
      .exec();
  }

  async updateQualification(
    qualificationId: string,
    employeeId: string,
    qualificationData: {
      establishmentName?: string;
      graduationType?: string;
    },
  ): Promise<EmployeeQualification> {
    const qualification =
      await this.qualificationModel.findById(qualificationId);

    if (!qualification) {
      throw new NotFoundException(
        `Qualification with ID ${qualificationId} not found`,
      );
    }

    // Check if the qualification belongs to the employee
    if (qualification.employeeProfileId.toString() !== employeeId.toString()) {
      throw new ForbiddenException(
        'You are not authorized to update this qualification',
      );
    }

    const updatedQualification = await this.qualificationModel
      .findByIdAndUpdate(
        qualificationId,
        { $set: qualificationData },
        { new: true },
      )
      .exec();

    if (!updatedQualification) {
      throw new NotFoundException('Qualification not found after update');
    }

    return updatedQualification;
  }

  async removeQualification(
    qualificationId: string,
    employeeId: string,
  ): Promise<void> {
    const qualification =
      await this.qualificationModel.findById(qualificationId);

    if (!qualification) {
      throw new NotFoundException(
        `Qualification with ID ${qualificationId} not found`,
      );
    }

    if (qualification.employeeProfileId.toString() !== employeeId.toString()) {
      throw new ForbiddenException(
        'You are not authorized to delete this qualification',
      );
    }

    await this.qualificationModel.findByIdAndDelete(qualificationId).exec();
  }

  // ==================== SEARCH & EXPORT METHODS ====================

  async advancedSearch(searchCriteria: any): Promise<any[]> {
    const {
      firstName,
      lastName,
      employeeNumber,
      departmentId,
      positionId,
      status,
      dateOfHireFrom,
      dateOfHireTo,
    } = searchCriteria;

    const filter: any = {};

    if (firstName) {
      filter.firstName = { $regex: firstName, $options: 'i' };
    }

    if (lastName) {
      filter.lastName = { $regex: lastName, $options: 'i' };
    }

    if (employeeNumber) {
      filter.employeeNumber = { $regex: employeeNumber, $options: 'i' };
    }

    if (departmentId) {
      filter.primaryDepartmentId = new Types.ObjectId(departmentId);
    }

    if (positionId) {
      filter.primaryPositionId = new Types.ObjectId(positionId);
    }

    if (status) {
      filter.status = status;
    }

    if (dateOfHireFrom || dateOfHireTo) {
      filter.dateOfHire = {};
      if (dateOfHireFrom) filter.dateOfHire.$gte = new Date(dateOfHireFrom);
      if (dateOfHireTo) filter.dateOfHire.$lte = new Date(dateOfHireTo);
    }

    return this.employeeModel
      .find(filter)
      .populate('primaryDepartmentId', 'name code')
      .populate('primaryPositionId', 'title code')
      .select('-password')
      .limit(100) // Limit results for performance
      .exec();
  }

  async exportToExcel(query: QueryEmployeeDto): Promise<Buffer> {
    const { data: employees } = await this.findAll(query);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employees');

    // Add headers
    worksheet.columns = [
      { header: 'Employee Number', key: 'employeeNumber', width: 20 },
      { header: 'Full Name', key: 'fullName', width: 30 },
      { header: 'Work Email', key: 'workEmail', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Department', key: 'department', width: 25 },
      { header: 'Position', key: 'position', width: 25 },
      { header: 'Date of Hire', key: 'dateOfHire', width: 15 },
      { header: 'Contract Type', key: 'contractType', width: 15 },
    ];

    // Add rows
    employees.forEach((employee: any) => {
      worksheet.addRow({
        employeeNumber: employee.employeeNumber,
        fullName: employee.fullName,
        workEmail: employee.workEmail,
        status: employee.status,
        department: employee.primaryDepartmentId?.name || 'N/A',
        position: employee.primaryPositionId?.title || 'N/A',
        dateOfHire: employee.dateOfHire
          ? new Date(employee.dateOfHire).toLocaleDateString()
          : 'N/A',
        contractType: employee.contractType || 'N/A',
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportToPdf(employeeId: string): Promise<Buffer> {
    const employee = await this.findOne(employeeId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Add content to PDF
      doc.fontSize(20).text('Employee Profile', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).text(`Employee Number: ${employee.employeeNumber}`);
      doc.text(`Full Name: ${employee.fullName}`);
      doc.text(`Work Email: ${employee.workEmail || 'N/A'}`);
      doc.text(`Status: ${employee.status}`);
      doc.text(`Date of Hire: ${employee.dateOfHire.toLocaleDateString()}`);

      if (
        employee.primaryDepartmentId &&
        typeof employee.primaryDepartmentId !== 'string'
      ) {
        const department = employee.primaryDepartmentId as any;
        doc.text(`Department: ${department.name || 'N/A'}`);
      }

      if (
        employee.primaryPositionId &&
        typeof employee.primaryPositionId !== 'string'
      ) {
        const position = employee.primaryPositionId as any;
        doc.text(`Position: ${position.title || 'N/A'}`);
      }

      doc.moveDown();
      doc.text('Contact Information:');
      doc.text(`Personal Email: ${employee.personalEmail || 'N/A'}`);
      doc.text(`Mobile Phone: ${employee.mobilePhone || 'N/A'}`);

      if (employee.address) {
        doc.text(
          `Address: ${employee.address.streetAddress || ''}, ${
            employee.address.city || ''
          }, ${employee.address.country || ''}`,
        );
      }

      doc.end();
    });
  }

  // ==================== TEAM MANAGEMENT ====================

  async getTeamMembers(managerId: string): Promise<EmployeeProfile[]> {
    // Find manager's position
    const manager = await this.findOne(managerId);

    if (!manager.primaryPositionId) {
      return [];
    }

    // Find all employees where supervisorPositionId matches manager's position
    return this.employeeModel
      .find({
        supervisorPositionId: manager.primaryPositionId,
        status: { $in: [EmployeeStatus.ACTIVE, EmployeeStatus.PROBATION] },
      })
      .populate('primaryDepartmentId', 'name code')
      .populate('primaryPositionId', 'title code')
      .select('-password')
      .exec();
  }

  async getTeamStatistics(managerId: string): Promise<any> {
    const teamMembers = await this.getTeamMembers(managerId);

    const stats = {
      totalMembers: teamMembers.length,
      byStatus: teamMembers.reduce((acc, member) => {
        acc[member.status] = (acc[member.status] || 0) + 1;
        return acc;
      }, {}),
      byDepartment: teamMembers.reduce((acc, member) => {
        const deptName = (member.primaryDepartmentId as any)?.name || 'Unknown';
        acc[deptName] = (acc[deptName] || 0) + 1;
        return acc;
      }, {}),
    };

    return stats;
  }

  // ==================== HELPER METHODS ====================

  private async generateEmployeeNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `EMP-${year}`;

    const lastEmployee = await this.employeeModel
      .findOne({ employeeNumber: { $regex: `^${prefix}` } })
      .sort({ employeeNumber: -1 })
      .exec();

    let sequence = 1;
    if (lastEmployee) {
      const lastSequence = parseInt(
        lastEmployee.employeeNumber.split('-')[2],
        10,
      );
      sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }

  private async generateCandidateNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CAN-${year}`;

    const lastCandidate = await this.candidateModel
      .findOne({ candidateNumber: { $regex: `^${prefix}` } })
      .sort({ candidateNumber: -1 })
      .exec();

    let sequence = 1;
    if (lastCandidate) {
      const lastSequence = parseInt(
        lastCandidate.candidateNumber.split('-')[2],
        10,
      );
      sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }

  private async generateChangeRequestId(): Promise<string> {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const prefix = `CHR-${year}${month}`;

    const lastRequest = await this.changeRequestModel
      .findOne({ requestId: { $regex: `^${prefix}` } })
      .sort({ requestId: -1 })
      .exec();

    let sequence = 1;
    if (lastRequest) {
      const lastSequence = parseInt(lastRequest.requestId.split('-')[2], 10);
      sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }

  async updateLastAppraisal(
    employeeId: string,
    appraisalData: {
      lastAppraisalRecordId?: Types.ObjectId;
      lastAppraisalCycleId?: Types.ObjectId;
      lastAppraisalTemplateId?: Types.ObjectId;
      lastAppraisalDate?: Date;
      lastAppraisalScore?: number;
      lastAppraisalRatingLabel?: string;
      lastAppraisalScaleType?: string;
      lastDevelopmentPlanSummary?: string;
    },
  ): Promise<void> {
    await this.employeeModel
      .findByIdAndUpdate(employeeId, { $set: appraisalData })
      .exec();
  }

  async findByDepartment(departmentId: string): Promise<EmployeeProfile[]> {
    if (!Types.ObjectId.isValid(departmentId)) {
      throw new BadRequestException('Invalid department ID');
    }
    return this.employeeModel
      .find({ primaryDepartmentId: new Types.ObjectId(departmentId) })
      .select('-password')
      .exec();
  }

  async findByPosition(positionId: string): Promise<EmployeeProfile[]> {
    return this.employeeModel
      .find({ primaryPositionId: new Types.ObjectId(positionId) })
      .select('-password')
      .exec();
  }

  async findBySupervisor(
    supervisorPositionId: string,
  ): Promise<EmployeeProfile[]> {
    return this.employeeModel
      .find({ supervisorPositionId: new Types.ObjectId(supervisorPositionId) })
      .select('-password')
      .exec();
  }

  async getEmployeeStats() {
    const stats = await this.employeeModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await this.employeeModel.countDocuments();

    return {
      total,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
    };
  }

  async registerCandidate(
    registerDto: RegisterCandidateDto,
  ): Promise<Candidate> {
    // Check for duplicate national ID
    const existingCandidate = await this.candidateModel
      .findOne({ nationalId: registerDto.nationalId })
      .exec();

    if (existingCandidate) {
      throw new ConflictException(
        'Candidate with this National ID already exists',
      );
    }

    // Check for duplicate personal email
    const existingEmail = await this.candidateModel
      .findOne({ personalEmail: registerDto.personalEmail })
      .exec();

    if (existingEmail) {
      throw new ConflictException('Candidate with this email already exists');
    }

    // Generate candidate number
    const candidateNumber = await this.generateCandidateNumber();

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create full name
    const fullName = [
      registerDto.firstName,
      registerDto.middleName,
      registerDto.lastName,
    ]
      .filter(Boolean)
      .join(' ');

    // Convert dateOfBirth string to Date object if provided
    const dateOfBirth = registerDto.dateOfBirth
      ? new Date(registerDto.dateOfBirth)
      : undefined;

    const candidate = new this.candidateModel({
      firstName: registerDto.firstName,
      middleName: registerDto.middleName,
      lastName: registerDto.lastName,
      nationalId: registerDto.nationalId,
      password: hashedPassword,
      gender: registerDto.gender,
      maritalStatus: registerDto.maritalStatus,
      dateOfBirth: dateOfBirth,
      personalEmail: registerDto.personalEmail,
      mobilePhone: registerDto.mobilePhone,
      homePhone: registerDto.homePhone,
      address: registerDto.address,
      candidateNumber,
      fullName,
      status: CandidateStatus.APPLIED,
      applicationDate: new Date(),
    });

    const savedCandidate = await candidate.save();

    // Create system role for candidate
    await this.systemRoleModel.create({
      employeeProfileId: savedCandidate._id, // Note: Using candidate ID as employeeProfileId
      roles: [SystemRole.JOB_CANDIDATE],
      isActive: true,
    });

    return savedCandidate.toObject();
  }
}
