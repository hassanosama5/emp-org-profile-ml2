import { SystemRole } from '../../employee-profile/enums/employee-profile.enums';
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: SystemRole[]) => import("@nestjs/common").CustomDecorator<string>;
