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
exports.TriggerLatenessDisciplinaryDto = exports.MonitorRepeatedLatenessDto = exports.EnforceShiftPunchPolicyDto = exports.EnforcePunchPolicyDto = exports.ApplyAttendanceRoundingDto = exports.RecordPunchWithMetadataDto = exports.ApplyPermissionToPayrollDto = exports.ProcessTimePermissionDto = exports.CreateTimePermissionRequestDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class PunchMetadataDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PunchMetadataDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], PunchMetadataDto.prototype, "time", void 0);
class CreateTimePermissionRequestDto {
}
exports.CreateTimePermissionRequestDto = CreateTimePermissionRequestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTimePermissionRequestDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateTimePermissionRequestDto.prototype, "permissionType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTimePermissionRequestDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], CreateTimePermissionRequestDto.prototype, "requestedStart", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], CreateTimePermissionRequestDto.prototype, "requestedEnd", void 0);
class ProcessTimePermissionDto {
}
exports.ProcessTimePermissionDto = ProcessTimePermissionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ProcessTimePermissionDto.prototype, "requestId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ProcessTimePermissionDto.prototype, "actorId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ProcessTimePermissionDto.prototype, "comment", void 0);
class ApplyPermissionToPayrollDto {
}
exports.ApplyPermissionToPayrollDto = ApplyPermissionToPayrollDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ApplyPermissionToPayrollDto.prototype, "requestId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ApplyPermissionToPayrollDto.prototype, "payrollPeriodId", void 0);
class RecordPunchWithMetadataDto {
}
exports.RecordPunchWithMetadataDto = RecordPunchWithMetadataDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RecordPunchWithMetadataDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PunchMetadataDto),
    __metadata("design:type", Array)
], RecordPunchWithMetadataDto.prototype, "punches", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordPunchWithMetadataDto.prototype, "deviceId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordPunchWithMetadataDto.prototype, "location", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordPunchWithMetadataDto.prototype, "source", void 0);
class ApplyAttendanceRoundingDto {
}
exports.ApplyAttendanceRoundingDto = ApplyAttendanceRoundingDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ApplyAttendanceRoundingDto.prototype, "attendanceRecordId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], ApplyAttendanceRoundingDto.prototype, "intervalMinutes", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ApplyAttendanceRoundingDto.prototype, "strategy", void 0);
class EnforcePunchPolicyDto {
}
exports.EnforcePunchPolicyDto = EnforcePunchPolicyDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PunchMetadataDto),
    __metadata("design:type", Array)
], EnforcePunchPolicyDto.prototype, "punches", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EnforcePunchPolicyDto.prototype, "policy", void 0);
class EnforceShiftPunchPolicyDto {
    constructor() {
        this.allowEarlyMinutes = 0;
        this.allowLateMinutes = 0;
    }
}
exports.EnforceShiftPunchPolicyDto = EnforceShiftPunchPolicyDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => PunchMetadataDto),
    __metadata("design:type", Array)
], EnforceShiftPunchPolicyDto.prototype, "punches", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EnforceShiftPunchPolicyDto.prototype, "shiftStart", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EnforceShiftPunchPolicyDto.prototype, "shiftEnd", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Object)
], EnforceShiftPunchPolicyDto.prototype, "allowEarlyMinutes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Object)
], EnforceShiftPunchPolicyDto.prototype, "allowLateMinutes", void 0);
class MonitorRepeatedLatenessDto {
}
exports.MonitorRepeatedLatenessDto = MonitorRepeatedLatenessDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], MonitorRepeatedLatenessDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], MonitorRepeatedLatenessDto.prototype, "threshold", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], MonitorRepeatedLatenessDto.prototype, "lookbackDays", void 0);
class TriggerLatenessDisciplinaryDto {
}
exports.TriggerLatenessDisciplinaryDto = TriggerLatenessDisciplinaryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TriggerLatenessDisciplinaryDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TriggerLatenessDisciplinaryDto.prototype, "action", void 0);
//# sourceMappingURL=time-permission.dtos.js.map