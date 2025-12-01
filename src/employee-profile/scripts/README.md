# Employee Profile Scripts

This directory contains utility scripts for testing, validation, and debugging the employee-profile module.

## Scripts

### 1. `validate-routes.ts`

Validates consistency between routes, DTOs, and schemas.

**Usage:**

```bash
npm run validate:routes
```

**What it checks:**

- DTO validation decorators
- Schema field consistency
- Enum definitions and usage
- Service method existence
- DTO-Schema field matching

**Output:**

- List of errors and warnings
- Validation report with issue locations

### 2. `debug-routes.ts`

Provides detailed information about all routes for debugging.

**Usage:**

```bash
npm run debug:routes
```

**Output includes:**

- All available routes with methods and paths
- DTO mappings for each route
- Role requirements grouped by access level
- Route parameters and their types
- Test examples for each route

## Integration

These scripts are integrated into the npm scripts in `package.json`:

- `npm run validate:routes` - Run route validation
- `npm run debug:routes` - Debug route information

## Requirements

- TypeScript
- ts-node (for running scripts)
- Access to source files

## Notes

- Scripts use file system reading to analyze code
- They provide static analysis, not runtime testing
- For runtime testing, use the E2E test suite
