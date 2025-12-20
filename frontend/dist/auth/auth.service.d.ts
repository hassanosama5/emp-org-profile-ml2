import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { EmployeeProfile } from '../employee-profile/models/employee-profile.schema';
import { EmployeeSystemRole } from '../employee-profile/models/employee-system-role.schema';
export declare class AuthService {
    private employeeModel;
    private systemRoleModel;
    private jwtService;
    constructor(employeeModel: Model<EmployeeProfile>, systemRoleModel: Model<EmployeeSystemRole>, jwtService: JwtService);
    validateUser(employeeNumber: string, password: string): Promise<any>;
    login(user: any): Promise<{
        access_token: string;
        user: {
            id: any;
            employeeNumber: any;
            fullName: any;
            workEmail: any;
            roles: any;
        };
    }>;
}
