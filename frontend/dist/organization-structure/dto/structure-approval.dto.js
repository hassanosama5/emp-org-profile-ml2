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
exports.StructureApprovalResponseDto = exports.UpdateApprovalDecisionDto = exports.CreateStructureApprovalDto = void 0;
const class_validator_1 = require("class-validator");
const organization_structure_enums_1 = require("../enums/organization-structure.enums");
class CreateStructureApprovalDto {
}
exports.CreateStructureApprovalDto = CreateStructureApprovalDto;
__decorate([
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], CreateStructureApprovalDto.prototype, "changeRequestId", void 0);
__decorate([
    (0, class_validator_1.IsMongoId)(),
    __metadata("design:type", String)
], CreateStructureApprovalDto.prototype, "approverEmployeeId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateStructureApprovalDto.prototype, "comments", void 0);
class UpdateApprovalDecisionDto {
}
exports.UpdateApprovalDecisionDto = UpdateApprovalDecisionDto;
__decorate([
    (0, class_validator_1.IsEnum)(organization_structure_enums_1.ApprovalDecision),
    __metadata("design:type", String)
], UpdateApprovalDecisionDto.prototype, "decision", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateApprovalDecisionDto.prototype, "comments", void 0);
class StructureApprovalResponseDto {
}
exports.StructureApprovalResponseDto = StructureApprovalResponseDto;
//# sourceMappingURL=structure-approval.dto.js.map