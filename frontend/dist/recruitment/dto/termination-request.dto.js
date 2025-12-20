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
exports.UpdateTerminationDetailsDto = exports.UpdateTerminationStatusDto = exports.CreateTerminationRequestDto = void 0;
const class_validator_1 = require("class-validator");
const termination_status_enum_1 = require("../enums/termination-status.enum");
const termination_initiation_enum_1 = require("../enums/termination-initiation.enum");
class CreateTerminationRequestDto {
}
exports.CreateTerminationRequestDto = CreateTerminationRequestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTerminationRequestDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(termination_initiation_enum_1.TerminationInitiation),
    __metadata("design:type", String)
], CreateTerminationRequestDto.prototype, "initiator", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTerminationRequestDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateTerminationRequestDto.prototype, "employeeComments", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateTerminationRequestDto.prototype, "terminationDate", void 0);
class UpdateTerminationStatusDto {
}
exports.UpdateTerminationStatusDto = UpdateTerminationStatusDto;
__decorate([
    (0, class_validator_1.IsEnum)(termination_status_enum_1.TerminationStatus),
    __metadata("design:type", String)
], UpdateTerminationStatusDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTerminationStatusDto.prototype, "hrComments", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateTerminationStatusDto.prototype, "terminationDate", void 0);
class UpdateTerminationDetailsDto {
}
exports.UpdateTerminationDetailsDto = UpdateTerminationDetailsDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTerminationDetailsDto.prototype, "reason", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateTerminationDetailsDto.prototype, "employeeComments", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateTerminationDetailsDto.prototype, "terminationDate", void 0);
//# sourceMappingURL=termination-request.dto.js.map