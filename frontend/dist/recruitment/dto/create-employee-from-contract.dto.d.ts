import { ContractType, WorkType } from '../../employee-profile/enums/employee-profile.enums';
export declare class CreateEmployeeFromContractDto {
    offerId: string;
    contractId?: string;
    workEmail?: string;
    contractType?: ContractType;
    workType?: WorkType;
    primaryDepartmentId?: string;
    supervisorPositionId?: string;
    payGradeId?: string;
}
