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
exports.StructureChangeRequestResponseDto = exports.SubmitChangeRequestDto = exports.UpdateStructureChangeRequestDto = exports.CreateStructureChangeRequestDto = void 0;
const class_validator_1 = require("class-validator");
const organization_structure_enums_1 = require("../enums/organization-structure.enums");
class CreateStructureChangeRequestDto {
}
exports.CreateStructureChangeRequestDto = CreateStructureChangeRequestDto;
__decorate([
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], CreateStructureChangeRequestDto.prototype, "requestedByEmployeeId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(organization_structure_enums_1.StructureRequestType),
    __metadata("design:type", String)
], CreateStructureChangeRequestDto.prototype, "requestType", void 0);
__decorate([
    (0, class_validator_1.IsMongoId)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateStructureChangeRequestDto.prototype, "targetDepartmentId", void 0);
__decorate([
    (0, class_validator_1.IsMongoId)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateStructureChangeRequestDto.prototype, "targetPositionId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateStructureChangeRequestDto.prototype, "details", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateStructureChangeRequestDto.prototype, "reason", void 0);
class UpdateStructureChangeRequestDto {
}
exports.UpdateStructureChangeRequestDto = UpdateStructureChangeRequestDto;
__decorate([
    (0, class_validator_1.IsEnum)(organization_structure_enums_1.StructureRequestType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateStructureChangeRequestDto.prototype, "requestType", void 0);
__decorate([
    (0, class_validator_1.IsMongoId)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateStructureChangeRequestDto.prototype, "targetDepartmentId", void 0);
__decorate([
    (0, class_validator_1.IsMongoId)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateStructureChangeRequestDto.prototype, "targetPositionId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateStructureChangeRequestDto.prototype, "details", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateStructureChangeRequestDto.prototype, "reason", void 0);
class SubmitChangeRequestDto {
}
exports.SubmitChangeRequestDto = SubmitChangeRequestDto;
__decorate([
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], SubmitChangeRequestDto.prototype, "submittedByEmployeeId", void 0);
class StructureChangeRequestResponseDto {
}
exports.StructureChangeRequestResponseDto = StructureChangeRequestResponseDto;
//# sourceMappingURL=structure-change-request.dto.js.map