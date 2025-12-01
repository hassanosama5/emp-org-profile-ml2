import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { EmployeeProfile } from '../employee-profile/models/employee-profile.schema';
import { EmployeeSystemRole } from '../employee-profile/models/employee-system-role.schema';
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
    private employeeModel: Model<EmployeeProfile>,
    @InjectModel(Candidate.name)
    private candidateModel: Model<CandidateDocument>,
    @InjectModel(EmployeeSystemRole.name)
    private systemRoleModel: Model<EmployeeSystemRole>,
    private jwtService: JwtService,
  ) {}

  async validateUser(employeeNumber: string, password: string): Promise<any> {
    const employee = await this.employeeModel
      .findOne({ employeeNumber })
      .exec();

    if (!employee || !employee.password) {
      throw new UnauthorizedException('Invalid credentials');
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
      roles: systemRole?.roles || [],
      permissions: systemRole?.permissions || [],
    };
  }

  async login(user: any) {
    const payload = {
      username: user.employeeNumber,
      sub: user._id,
      roles: user.roles,
      permissions: user.permissions,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        employeeNumber: user.employeeNumber,
        fullName: user.fullName,
        workEmail: user.workEmail,
        roles: user.roles,
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
      permissions: [], // No additional permissions for candidates
      isActive: true,
    });

    // Generate JWT token for immediate login
    const payload = {
      username: savedCandidate.candidateNumber,
      sub: savedCandidate._id.toString(),
      roles: [SystemRole.JOB_CANDIDATE],
      permissions: [],
      type: 'candidate',
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
