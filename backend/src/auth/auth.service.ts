import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import {
  EmployeeProfile,
  EmployeeProfileDocument,
} from '../employee-profile/models/employee-profile.schema';
import {
  EmployeeSystemRole,
  EmployeeSystemRoleDocument,
} from '../employee-profile/models/employee-system-role.schema';
import {
  Candidate,
  CandidateDocument,
} from '../employee-profile/models/candidate.schema';
import { RegisterCandidateDto } from '../employee-profile/dto/register-candidate.dto';
import {
  SystemRole,
  CandidateStatus,
} from '../employee-profile/enums/employee-profile.enums';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(EmployeeProfile.name)
    private employeeModel: Model<EmployeeProfileDocument>,
    @InjectModel(Candidate.name)
    private candidateModel: Model<CandidateDocument>,
    @InjectModel(EmployeeSystemRole.name)
    private systemRoleModel: Model<EmployeeSystemRoleDocument>,
    private jwtService: JwtService,
  ) {}

  async validateUser(employeeNumber: string, password: string): Promise<any> {
    // Try to find as employee first
    const employee = await this.employeeModel
      .findOne({ employeeNumber })
      .exec();

    if (employee && employee.password) {
      return await this.validateEmployee(employee, password);
    }

    // If not found as employee, try as candidate
    const candidate = await this.candidateModel
      .findOne({
        $or: [
          { candidateNumber: employeeNumber },
          { personalEmail: employeeNumber },
        ],
      })
      .exec();

    if (candidate && candidate.password) {
      return await this.validateCandidate(candidate, password);
    }

    throw new UnauthorizedException('Invalid credentials');
  }

  private async validateEmployee(
    employee: EmployeeProfileDocument,
    password: string,
  ): Promise<any> {
    // ========================================================================
    // RECRUITMENT SYSTEM - Employee Status Access Control
    // ========================================================================
    // Employees with RETIRED or TERMINATED status cannot log in to the system.
    // - RETIRED: Employee resigned and left the organization
    // - TERMINATED: Employee was terminated by HR/Management
    // - INACTIVE: System access manually revoked (backward compatibility)
    // - PROBATION: New hires can log in normally (onboarding in progress)
    // - ACTIVE: Full access (normal operation)
    // ========================================================================
    if (employee.status === 'RETIRED') {
      throw new UnauthorizedException(
        'Your account has been retired due to resignation. System access has been revoked. Please contact HR for assistance.',
      );
    }
    
    if (employee.status === 'TERMINATED') {
      throw new UnauthorizedException(
        'Your account has been terminated. System access has been revoked. Please contact HR for assistance.',
      );
    }
    
    // Backward compatibility: INACTIVE status (manual access revocation)
    if (employee.status === 'INACTIVE') {
      throw new UnauthorizedException(
        'Your account has been deactivated. System access has been revoked. Please contact HR for assistance.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, employee.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const systemRole = await this.systemRoleModel
      .findOne({ employeeProfileId: employee._id })
      .exec();

    const { password: _, ...result } = employee.toObject();

    return {
      ...result,
      userType: 'employee',
      identifier: employee.employeeNumber,
      roles: systemRole?.roles || [],
      permissions: systemRole?.permissions || [],
      profilePictureUrl: employee.profilePictureUrl, // ADDED
    };
  }

  private async validateCandidate(
    candidate: CandidateDocument,
    password: string,
  ): Promise<any> {
    const isPasswordValid = await bcrypt.compare(password, candidate.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const systemRole = await this.systemRoleModel
      .findOne({ employeeProfileId: candidate._id })
      .exec();

    const { password: _, ...result } = candidate.toObject();

    return {
      ...result,
      userType: 'candidate',
      identifier: candidate.candidateNumber,
      roles: systemRole?.roles || [],
      permissions: systemRole?.permissions || [],
      profilePictureUrl: candidate.profilePictureUrl, // ADDED
    };
  }

  async login(user: any) {
    const payload = {
      username:
        user.employeeNumber || user.candidateNumber || user.personalEmail,
      sub: user._id,
      roles: user.roles,
      permissions: user.permissions,
      userType:
        user.userType || (user.employeeNumber ? 'employee' : 'candidate'),
      // ========================================================================
      // NEW CHANGES FOR OFFBOARDING: Added employeeNumber to JWT payload
      // Required for OFF-018 (Employee Resignation) and OFF-001 (HR Termination)
      // The resignation endpoint needs employeeNumber from token to identify user
      // ========================================================================
      employeeNumber: user.employeeNumber || null,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        employeeNumber: user.employeeNumber,
        candidateNumber: user.candidateNumber,
        fullName: user.fullName,
        workEmail: user.workEmail,
        personalEmail: user.personalEmail,
        roles: user.roles,
        userType:
          user.userType || (user.employeeNumber ? 'employee' : 'candidate'),
        profilePictureUrl: user.profilePictureUrl, // ADDED
      },
    };
  }

  async registerCandidate(registerDto: RegisterCandidateDto) {
    // Check for duplicate national ID in candidates
    const existingCandidateByNationalId = await this.candidateModel
      .findOne({ nationalId: registerDto.nationalId })
      .exec();

    if (existingCandidateByNationalId) {
      throw new ConflictException(
        'Candidate with this National ID already exists',
      );
    }

    // Check for duplicate national ID in employees
    const existingEmployeeByNationalId = await this.employeeModel
      .findOne({ nationalId: registerDto.nationalId })
      .exec();

    if (existingEmployeeByNationalId) {
      throw new ConflictException(
        'Employee with this National ID already exists',
      );
    }

    // Check for duplicate personal email in candidates
    const existingCandidateByEmail = await this.candidateModel
      .findOne({ personalEmail: registerDto.personalEmail })
      .exec();

    if (existingCandidateByEmail) {
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
      departmentId: registerDto.departmentId,
      positionId: registerDto.positionId,
      resumeUrl: registerDto.resumeUrl,
      notes: registerDto.notes,
      candidateNumber,
      fullName,
      status: CandidateStatus.APPLIED,
      applicationDate: new Date(),
    });

    const savedCandidate = await candidate.save();

    // Create system role for candidate
    await this.systemRoleModel.create({
      employeeProfileId: savedCandidate._id,
      roles: [SystemRole.JOB_CANDIDATE],
      permissions: [],
      isActive: true,
    });

    // Generate JWT token for immediate login
    const payload = {
      username: savedCandidate.candidateNumber,
      sub: savedCandidate._id.toString(),
      roles: [SystemRole.JOB_CANDIDATE],
      permissions: [],
      userType: 'candidate',
    };

    const accessToken = this.jwtService.sign(payload);

    // Remove password from response
    const { password: _, ...candidateWithoutPassword } =
      savedCandidate.toObject();

    return {
      access_token: accessToken,
      user: {
        id: candidateWithoutPassword._id,
        candidateNumber: candidateWithoutPassword.candidateNumber,
        fullName: candidateWithoutPassword.fullName,
        personalEmail: candidateWithoutPassword.personalEmail,
        roles: [SystemRole.JOB_CANDIDATE],
        userType: 'candidate',
        profilePictureUrl: candidateWithoutPassword.profilePictureUrl, // ADDED
      },
    };
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
}
