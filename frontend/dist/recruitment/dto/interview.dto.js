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
exports.UpdateInterviewStatusDto = exports.ScheduleInterviewDto = exports.IsValidISODateConstraint = void 0;
const class_validator_1 = require("class-validator");
const class_validator_2 = require("class-validator");
const application_stage_enum_1 = require("../enums/application-stage.enum");
const interview_method_enum_1 = require("../enums/interview-method.enum");
const interview_status_enum_1 = require("../enums/interview-status.enum");
let IsValidISODateConstraint = class IsValidISODateConstraint {
    validate(value) {
        if (typeof value !== 'string')
            return false;
        const date = new Date(value);
        return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}T/.test(value);
    }
    defaultMessage() {
        return 'scheduledDate must be a valid ISO 8601 date string';
    }
};
exports.IsValidISODateConstraint = IsValidISODateConstraint;
exports.IsValidISODateConstraint = IsValidISODateConstraint = __decorate([
    (0, class_validator_2.ValidatorConstraint)({ name: 'isValidISODate', async: false })
], IsValidISODateConstraint);
class ScheduleInterviewDto {
}
exports.ScheduleInterviewDto = ScheduleInterviewDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScheduleInterviewDto.prototype, "applicationId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(application_stage_enum_1.ApplicationStage),
    __metadata("design:type", String)
], ScheduleInterviewDto.prototype, "stage", void 0);
__decorate([
    (0, class_validator_1.Validate)(IsValidISODateConstraint),
    __metadata("design:type", String)
], ScheduleInterviewDto.prototype, "scheduledDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(interview_method_enum_1.InterviewMethod),
    __metadata("design:type", String)
], ScheduleInterviewDto.prototype, "method", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], ScheduleInterviewDto.prototype, "panel", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ScheduleInterviewDto.prototype, "videoLink", void 0);
class UpdateInterviewStatusDto {
}
exports.UpdateInterviewStatusDto = UpdateInterviewStatusDto;
__decorate([
    (0, class_validator_1.IsEnum)(interview_status_enum_1.InterviewStatus),
    __metadata("design:type", String)
], UpdateInterviewStatusDto.prototype, "status", void 0);
//# sourceMappingURL=interview.dto.js.map