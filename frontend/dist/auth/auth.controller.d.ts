import { AuthService } from './auth.service';
declare class LoginDto {
    employeeNumber: string;
    password: string;
}
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: any;
            employeeNumber: any;
            fullName: any;
            workEmail: any;
            roles: any;
        };
        message: string;
    }>;
}
export {};
