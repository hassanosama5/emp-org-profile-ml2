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
exports.FinalizeOfferDto = exports.RespondToOfferDto = exports.CreateOfferDto = exports.IsValidISODateConstraint = void 0;
const class_validator_1 = require("class-validator");
const class_validator_2 = require("class-validator");
const offer_response_status_enum_1 = require("../enums/offer-response-status.enum");
const offer_final_status_enum_1 = require("../enums/offer-final-status.enum");
let IsValidISODateConstraint = class IsValidISODateConstraint {
    validate(value) {
        if (typeof value !== 'string')
            return false;
        const date = new Date(value);
        return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}T/.test(value);
    }
    defaultMessage() {
        return 'deadline must be a valid ISO 8601 date string';
    }
};
exports.IsValidISODateConstraint = IsValidISODateConstraint;
exports.IsValidISODateConstraint = IsValidISODateConstraint = __decorate([
    (0, class_validator_2.ValidatorConstraint)({ name: 'isValidISODate', async: false })
], IsValidISODateConstraint);
class CreateOfferDto {
}
exports.CreateOfferDto = CreateOfferDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "applicationId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "candidateId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateOfferDto.prototype, "grossSalary", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateOfferDto.prototype, "signingBonus", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateOfferDto.prototype, "benefits", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "conditions", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "insurances", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "content", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.Validate)(IsValidISODateConstraint),
    __metadata("design:type", String)
], CreateOfferDto.prototype, "deadline", void 0);
class RespondToOfferDto {
}
exports.RespondToOfferDto = RespondToOfferDto;
__decorate([
    (0, class_validator_1.IsEnum)(offer_response_status_enum_1.OfferResponseStatus),
    __metadata("design:type", String)
], RespondToOfferDto.prototype, "applicantResponse", void 0);
class FinalizeOfferDto {
}
exports.FinalizeOfferDto = FinalizeOfferDto;
__decorate([
    (0, class_validator_1.IsEnum)(offer_final_status_enum_1.OfferFinalStatus),
    __metadata("design:type", String)
], FinalizeOfferDto.prototype, "finalStatus", void 0);
//# sourceMappingURL=offer.dto.js.map