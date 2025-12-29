"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RejectCorrectionRequestDto = exports.ApproveCorrectionRequestDto = exports.EscalateTimeExceptionDto = exports.RejectTimeExceptionDto = exports.ApproveTimeExceptionDto = exports.GetTimeExceptionsByEmployeeDto = exports.UpdateTimeExceptionDto = exports.CreateTimeExceptionDto = exports.GetAllCorrectionsDto = exports.GetCorrectionsDto = exports.SubmitCorrectionRequestDto = exports.CalculateWorkMinutesDto = exports.ValidateAttendanceDto = exports.UpdateAttendanceRecordDto = exports.GetAttendanceRecordDto = exports.CreateAttendanceRecordDto = void 0;
const class_validator_1 = require("class-validator");
const enums_1 = require("../models/enums");
class CreateAttendanceRecordDto {
}
exports.CreateAttendanceRecordDto = CreateAttendanceRecordDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateAttendanceRecordDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateAttendanceRecordDto.prototype, "punches", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateAttendanceRecordDto.prototype, "totalWorkMinutes", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateAttendanceRecordDto.prototype, "hasMissedPunch", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], CreateAttendanceRecordDto.prototype, "exceptionIds", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateAttendanceRecordDto.prototype, "finalisedForPayroll", void 0);
class GetAttendanceRecordDto {
}
exports.GetAttendanceRecordDto = GetAttendanceRecordDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetAttendanceRecordDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], GetAttendanceRecordDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], GetAttendanceRecordDto.prototype, "endDate", void 0);
class UpdateAttendanceRecordDto {
}
exports.UpdateAttendanceRecordDto = UpdateAttendanceRecordDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], UpdateAttendanceRecordDto.prototype, "punches", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateAttendanceRecordDto.prototype, "totalWorkMinutes", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateAttendanceRecordDto.prototype, "hasMissedPunch", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], UpdateAttendanceRecordDto.prototype, "exceptionIds", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateAttendanceRecordDto.prototype, "finalisedForPayroll", void 0);
class ValidateAttendanceDto {
}
exports.ValidateAttendanceDto = ValidateAttendanceDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ValidateAttendanceDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], ValidateAttendanceDto.prototype, "date", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ValidateAttendanceDto.prototype, "shiftId", void 0);
class CalculateWorkMinutesDto {
}
exports.CalculateWorkMinutesDto = CalculateWorkMinutesDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CalculateWorkMinutesDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], CalculateWorkMinutesDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], CalculateWorkMinutesDto.prototype, "endDate", void 0);
class SubmitCorrectionRequestDto {
}
exports.SubmitCorrectionRequestDto = SubmitCorrectionRequestDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitCorrectionRequestDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitCorrectionRequestDto.prototype, "attendanceRecord", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitCorrectionRequestDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(enums_1.CorrectionRequestStatus),
    __metadata("design:type", String)
], SubmitCorrectionRequestDto.prototype, "status", void 0);
class GetCorrectionsDto {
}
exports.GetCorrectionsDto = GetCorrectionsDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(enums_1.CorrectionRequestStatus),
    __metadata("design:type", String)
], GetCorrectionsDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetCorrectionsDto.prototype, "employeeId", void 0);
class GetAllCorrectionsDto {
}
exports.GetAllCorrectionsDto = GetAllCorrectionsDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(enums_1.CorrectionRequestStatus),
    __metadata("design:type", String)
], GetAllCorrectionsDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetAllCorrectionsDto.prototype, "employeeId", void 0);
class CreateTimeExceptionDto {
}
exports.CreateTimeExceptionDto = CreateTimeExceptionDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTimeExceptionDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(enums_1.TimeExceptionType),
    __metadata("design:type", String)
], CreateTimeExceptionDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTimeExceptionDto.prototype, "attendanceRecordId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTimeExceptionDto.prototype, "assignedTo", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(enums_1.TimeExceptionStatus),
    __metadata("design:type", String)
], CreateTimeExceptionDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTimeExceptionDto.prototype, "reason", void 0);
class UpdateTimeExceptionDto {
}
exports.UpdateTimeExceptionDto = UpdateTimeExceptionDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(enums_1.TimeExceptionStatus),
    __metadata("design:type", String)
], UpdateTimeExceptionDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTimeExceptionDto.prototype, "assignedTo", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTimeExceptionDto.prototype, "reason", void 0);
class GetTimeExceptionsByEmployeeDto {
}
exports.GetTimeExceptionsByEmployeeDto = GetTimeExceptionsByEmployeeDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GetTimeExceptionsByEmployeeDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(enums_1.TimeExceptionStatus),
    __metadata("design:type", String)
], GetTimeExceptionsByEmployeeDto.prototype, "status", void 0);
class ApproveTimeExceptionDto {
}
exports.ApproveTimeExceptionDto = ApproveTimeExceptionDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveTimeExceptionDto.prototype, "timeExceptionId", void 0);
class RejectTimeExceptionDto {
}
exports.RejectTimeExceptionDto = RejectTimeExceptionDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RejectTimeExceptionDto.prototype, "timeExceptionId", void 0);
class EscalateTimeExceptionDto {
}
exports.EscalateTimeExceptionDto = EscalateTimeExceptionDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EscalateTimeExceptionDto.prototype, "timeExceptionId", void 0);
class ApproveCorrectionRequestDto {
}
exports.ApproveCorrectionRequestDto = ApproveCorrectionRequestDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveCorrectionRequestDto.prototype, "correctionRequestId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApproveCorrectionRequestDto.prototype, "reason", void 0);
class RejectCorrectionRequestDto {
}
exports.RejectCorrectionRequestDto = RejectCorrectionRequestDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RejectCorrectionRequestDto.prototype, "correctionRequestId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RejectCorrectionRequestDto.prototype, "reason", void 0);
//# sourceMappingURL=attendance.dtos.js.map