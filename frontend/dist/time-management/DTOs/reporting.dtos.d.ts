export declare class GenerateOvertimeReportDto {
    employeeId?: string;
    startDate?: Date;
    endDate?: Date;
}
export declare class GenerateLatenessReportDto {
    employeeId?: string;
    startDate?: Date;
    endDate?: Date;
}
export declare class GenerateExceptionReportDto {
    employeeId?: string;
    startDate?: Date;
    endDate?: Date;
}
export declare class ExportReportDto {
    reportType: 'overtime' | 'lateness' | 'exception';
    format: 'excel' | 'csv' | 'text';
    employeeId?: string;
    startDate?: Date;
    endDate?: Date;
}
