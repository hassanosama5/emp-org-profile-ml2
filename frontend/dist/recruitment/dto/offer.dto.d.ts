import { ValidatorConstraintInterface } from 'class-validator';
import { OfferResponseStatus } from '../enums/offer-response-status.enum';
import { OfferFinalStatus } from '../enums/offer-final-status.enum';
export declare class IsValidISODateConstraint implements ValidatorConstraintInterface {
    validate(value: any): boolean;
    defaultMessage(): string;
}
export declare class CreateOfferDto {
    applicationId: string;
    candidateId: string;
    grossSalary: number;
    signingBonus?: number;
    benefits?: string[];
    conditions?: string;
    insurances?: string;
    content?: string;
    role?: string;
    deadline: string;
}
export declare class RespondToOfferDto {
    applicantResponse: OfferResponseStatus;
}
export declare class FinalizeOfferDto {
    finalStatus: OfferFinalStatus;
}
