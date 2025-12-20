declare class RouteValidator {
    private issues;
    private expectedRoutes;
    validate(): void;
    private validateDTOs;
    private validateSchemas;
    private validateEnums;
    private validateServiceMethods;
    private validateDTOSchemaConsistency;
    private addIssue;
    private printReport;
}
export { RouteValidator };
