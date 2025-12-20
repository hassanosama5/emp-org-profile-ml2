declare class RouteDebugger {
    private routes;
    analyze(): void;
    private loadRoutesFromController;
    private displayRoutes;
    private displayDTOMappings;
    private displayRoleRequirements;
    private displayRouteParameters;
    private getDTOFileName;
    private getQueryParamType;
    generateTestExamples(): void;
}
export { RouteDebugger };
