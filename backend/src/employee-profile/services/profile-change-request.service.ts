import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmployeeProfileChangeRequest } from '../models/ep-change-request.schema';
import {
  CreateProfileChangeRequestDto,
  ProcessProfileChangeRequestDto,
} from '../dto';
import { ProfileChangeStatus } from '../enums/employee-profile.enums';

@Injectable()
export class ProfileChangeRequestService {
  constructor(
    @InjectModel(EmployeeProfileChangeRequest.name)
    private changeRequestModel: Model<EmployeeProfileChangeRequest>,
  ) {}

  async create(
    employeeId: string,
    createDto: CreateProfileChangeRequestDto,
  ): Promise<EmployeeProfileChangeRequest> {
    const requestId = await this.generateRequestId();

    const changeRequest = await this.changeRequestModel.create({
      requestId,
      employeeProfileId: new Types.ObjectId(employeeId),
      requestDescription: createDto.requestDescription,
      reason: createDto.reason,
      status: ProfileChangeStatus.PENDING,
      submittedAt: new Date(),
    });

    return changeRequest;
  }

  async findAll(query: { status?: ProfileChangeStatus; employeeId?: string }) {
    const filter: any = {};

    if (query.status) {
      filter.status = query.status;
    }

    if (query.employeeId) {
      filter.employeeProfileId = new Types.ObjectId(query.employeeId);
    }

    return this.changeRequestModel
      .find(filter)
      .populate('employeeProfileId', 'firstName lastName employeeNumber')
      .sort({ submittedAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<EmployeeProfileChangeRequest> {
    const request = await this.changeRequestModel
      .findById(id)
      .populate('employeeProfileId')
      .exec();

    if (!request) {
      throw new NotFoundException(`Change request with ID ${id} not found`);
    }

    return request;
  }

  async process(
    id: string,
    processDto: ProcessProfileChangeRequestDto,
  ): Promise<EmployeeProfileChangeRequest> {
    const request = await this.findOne(id);

    if (request.status !== ProfileChangeStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be processed');
    }

    const updated = await this.changeRequestModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status: processDto.status as any,
          processedAt: new Date(),
          reason: processDto.reason || request.reason,
        },
      },
      { new: true },
    );

    return updated;
  }

  async cancel(
    id: string,
    employeeId: string,
  ): Promise<EmployeeProfileChangeRequest> {
    const request = await this.findOne(id);

    if (request.employeeProfileId.toString() !== employeeId) {
      throw new BadRequestException('You can only cancel your own requests');
    }

    if (request.status !== ProfileChangeStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be canceled');
    }

    const updated = await this.changeRequestModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status: ProfileChangeStatus.CANCELED,
          processedAt: new Date(),
        },
      },
      { new: true },
    );

    return updated;
  }

  private async generateRequestId(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PCR-${year}`;

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
}
