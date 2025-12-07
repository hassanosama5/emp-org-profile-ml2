# 🚀 Postman Quick Reference - Payroll Configuration

## Base URL

```
http://localhost:5000/api/v1
```

## Authentication Header

```
Authorization: Bearer {{token}}
```

## Get Token (Login)

```
POST /auth/login
Body: { "employeeNumber": "EMP001", "password": "password" }
```

---

## 📋 All Endpoints

### Pay Grades

```
GET    /payroll-configuration/pay-grades
GET    /payroll-configuration/pay-grades/:id
POST   /payroll-configuration/pay-grades                    [PAYROLL_SPECIALIST]
PUT    /payroll-configuration/pay-grades/:id                [PAYROLL_SPECIALIST]
DELETE /payroll-configuration/pay-grades/:id                [PAYROLL_MANAGER]
POST   /payroll-configuration/pay-grades/:id/approve        [PAYROLL_MANAGER]
POST   /payroll-configuration/pay-grades/:id/reject         [PAYROLL_MANAGER]
```

### Allowances

```
GET    /payroll-configuration/allowances
GET    /payroll-configuration/allowances/:id
POST   /payroll-configuration/allowances                    [PAYROLL_SPECIALIST]
PUT    /payroll-configuration/allowances/:id                [PAYROLL_SPECIALIST]
DELETE /payroll-configuration/allowances/:id                [PAYROLL_MANAGER]
POST   /payroll-configuration/allowances/:id/approve        [PAYROLL_MANAGER]
POST   /payroll-configuration/allowances/:id/reject         [PAYROLL_MANAGER]
```

### Pay Types

```
GET    /payroll-configuration/pay-types
GET    /payroll-configuration/pay-types/:id
POST   /payroll-configuration/pay-types                     [PAYROLL_SPECIALIST]
PUT    /payroll-configuration/pay-types/:id                [PAYROLL_SPECIALIST]
DELETE /payroll-configuration/pay-types/:id                [PAYROLL_MANAGER]
POST   /payroll-configuration/pay-types/:id/approve        [PAYROLL_MANAGER]
POST   /payroll-configuration/pay-types/:id/reject         [PAYROLL_MANAGER]
```

### Tax Rules

```
GET    /payroll-configuration/tax-rules
GET    /payroll-configuration/tax-rules/:id
POST   /payroll-configuration/tax-rules                    [LEGAL_POLICY_ADMIN]
PUT    /payroll-configuration/tax-rules/:id                [LEGAL_POLICY_ADMIN]
DELETE /payroll-configuration/tax-rules/:id                [PAYROLL_MANAGER]
POST   /payroll-configuration/tax-rules/:id/approve        [PAYROLL_MANAGER]
POST   /payroll-configuration/tax-rules/:id/reject         [PAYROLL_MANAGER]
```

### Insurance Brackets

```
GET    /payroll-configuration/insurance-brackets
GET    /payroll-configuration/insurance-brackets/:id
POST   /payroll-configuration/insurance-brackets            [PAYROLL_SPECIALIST]
PUT    /payroll-configuration/insurance-brackets/:id          [PAYROLL_SPECIALIST]
DELETE /payroll-configuration/insurance-brackets/:id        [HR_MANAGER]
POST   /payroll-configuration/insurance-brackets/:id/approve [HR_MANAGER]
POST   /payroll-configuration/insurance-brackets/:id/reject  [HR_MANAGER]
```

### Signing Bonuses

```
GET    /payroll-configuration/signing-bonuses
GET    /payroll-configuration/signing-bonuses/:id
POST   /payroll-configuration/signing-bonuses              [PAYROLL_SPECIALIST]
PUT    /payroll-configuration/signing-bonuses/:id          [PAYROLL_SPECIALIST]
DELETE /payroll-configuration/signing-bonuses/:id          [PAYROLL_MANAGER]
POST   /payroll-configuration/signing-bonuses/:id/approve [PAYROLL_MANAGER]
POST   /payroll-configuration/signing-bonuses/:id/reject  [PAYROLL_MANAGER]
```

### Termination Benefits

```
GET    /payroll-configuration/termination-benefits
GET    /payroll-configuration/termination-benefits/:id
POST   /payroll-configuration/termination-benefits         [PAYROLL_SPECIALIST]
PUT    /payroll-configuration/termination-benefits/:id     [PAYROLL_SPECIALIST]
DELETE /payroll-configuration/termination-benefits/:id     [PAYROLL_MANAGER]
POST   /payroll-configuration/termination-benefits/:id/approve [PAYROLL_MANAGER]
POST   /payroll-configuration/termination-benefits/:id/reject  [PAYROLL_MANAGER]
```

### Payroll Policies

```
GET    /payroll-configuration/policies
GET    /payroll-configuration/policies/:id
POST   /payroll-configuration/policies                     [PAYROLL_SPECIALIST]
PUT    /payroll-configuration/policies/:id                 [PAYROLL_SPECIALIST]
DELETE /payroll-configuration/policies/:id                 [PAYROLL_MANAGER]
POST   /payroll-configuration/policies/:id/approve         [PAYROLL_MANAGER]
POST   /payroll-configuration/policies/:id/reject         [PAYROLL_MANAGER]
```

### Company Settings

```
GET    /payroll-configuration/company-settings
POST   /payroll-configuration/company-settings             [SYSTEM_ADMIN]
PUT    /payroll-configuration/company-settings              [SYSTEM_ADMIN]
```

### Dashboard & Utilities

```
GET    /payroll-configuration/stats                        [PAYROLL_MANAGER]
GET    /payroll-configuration/pending-approvals            [PAYROLL_MANAGER]
GET    /payroll-configuration/debug/db                     [SYSTEM_ADMIN]
```

---

## 📝 Sample Request Bodies

### Create Pay Grade

```json
{
  "grade": "A",
  "baseSalary": 6000,
  "grossSalary": 8000
}
```

### Create Allowance

```json
{
  "name": "Housing Allowance",
  "amount": 2000
}
```

### Create Tax Rule

```json
{
  "name": "Income Tax",
  "description": "Standard income tax rate",
  "rate": 15.5
}
```

### Create Insurance Bracket

```json
{
  "name": "Bracket 1",
  "minSalary": 6000,
  "maxSalary": 10000,
  "employeeRate": 5.0,
  "employerRate": 10.0
}
```

### Create Payroll Policy

```json
{
  "policyName": "Overtime Policy",
  "policyType": "OVERTIME",
  "description": "Overtime calculation policy",
  "effectiveDate": "2024-01-01T00:00:00.000Z",
  "ruleDefinition": {
    "percentage": 50,
    "fixedAmount": 0,
    "thresholdAmount": 40
  },
  "applicability": "ALL_EMPLOYEES"
}
```

### Create Company Settings

```json
{
  "payDate": "2024-01-15T00:00:00.000Z",
  "timeZone": "Africa/Cairo",
  "currency": "EGP"
}
```

### Approve/Reject

```json
{
  "comment": "Approved after review"
}
```

---

## 🔑 Required Roles

- **PAYROLL_SPECIALIST** - Create/Update items
- **PAYROLL_MANAGER** - Approve/Reject/Delete items
- **HR_MANAGER** - Approve Insurance Brackets
- **LEGAL_POLICY_ADMIN** - Manage Tax Rules
- **SYSTEM_ADMIN** - Manage Company Settings

---

## ⚠️ Validation Rules

### Pay Grade

- `baseSalary` ≥ 6000
- `grossSalary` ≥ 6000
- `grossSalary` ≥ `baseSalary`

### Allowance

- `amount` ≥ 0

### Pay Type

- `amount` ≥ 6000

### Tax Rule

- `rate` ≥ 0

### Insurance Bracket

- `minSalary` < `maxSalary`
- `employeeRate` between 0-100
- `employerRate` between 0-100

### Company Settings

- `currency` must be "EGP"

---

## 🔄 Status Flow

```
DRAFT → APPROVED (via approve endpoint)
DRAFT → REJECTED (via reject endpoint)
```

**Note:** Only DRAFT items can be:

- Updated (PUT)
- Approved
- Rejected
- Deleted (except REJECTED items cannot be deleted)

---

## 📊 Query Parameters

### Pagination & Filtering

```
?page=1&limit=10&status=DRAFT&createdBy=USER_ID
```

**Available statuses:**

- `DRAFT`
- `APPROVED`
- `REJECTED`

---

## ✅ Quick Test Sequence

1. **Login** → Get token
2. **Create** → POST (as PAYROLL_SPECIALIST)
3. **List** → GET (verify DRAFT status)
4. **Update** → PUT (modify DRAFT item)
5. **Approve** → POST /approve (as PAYROLL_MANAGER)
6. **List** → GET (verify APPROVED status)

---

**For detailed examples, see `POSTMAN_TESTING_GUIDE.md`**
