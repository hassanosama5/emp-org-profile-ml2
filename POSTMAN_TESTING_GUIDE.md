# 📬 Postman Testing Guide - Payroll Configuration Module

## 🚀 Quick Start

### Base URL

```
http://localhost:5000/api/v1
```

### Authentication

All endpoints require JWT authentication. You'll need to login first to get an access token.

---

## 📋 Table of Contents

1. [Setup & Authentication](#1-setup--authentication)
2. [Pay Grades](#2-pay-grades)
3. [Allowances](#3-allowances)
4. [Pay Types](#4-pay-types)
5. [Tax Rules](#5-tax-rules)
6. [Insurance Brackets](#6-insurance-brackets)
7. [Signing Bonuses](#7-signing-bonuses)
8. [Termination Benefits](#8-termination-benefits)
9. [Payroll Policies](#9-payroll-policies)
10. [Company Settings](#10-company-settings)
11. [Dashboard & Utilities](#11-dashboard--utilities)

---

## 1. Setup & Authentication

### Step 1: Login to Get Access Token

**Request:**

- **Method:** `POST`
- **URL:** `http://localhost:5000/api/v1/auth/login`
- **Headers:**
  ```
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "employeeNumber": "EMP001",
    "password": "your_password"
  }
  ```

**Expected Response (200 OK):**

```json
{
  "message": "Login successful",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "665f1c2b5b88c3d9b3c3b1ab",
    "employeeNumber": "EMP001",
    "fullName": "John Doe",
    "workEmail": "john.doe@company.com",
    "roles": ["Payroll Specialist"]
  }
}
```

### Step 2: Set Up Postman Environment Variable

1. In Postman, create a new Environment (or use existing)
2. Add variable:
   - **Variable Name:** `token`
   - **Initial Value:** (leave empty)
   - **Current Value:** (paste your access_token from login response)

3. For all subsequent requests, add this header:
   ```
   Authorization: Bearer {{token}}
   ```

**⚠️ CRITICAL:** You need different roles for different operations. **You must login with the correct user before testing each endpoint that requires a specific role.**

### 📊 Role Requirements Quick Reference

| Operation             | Required Role          | Endpoints                                                                                                   |
| --------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| **View/List**         | Any authenticated user | All GET endpoints                                                                                           |
| **Create**            | `PAYROLL_SPECIALIST`   | POST pay-grades, allowances, pay-types, signing-bonuses, termination-benefits, policies, insurance-brackets |
| **Create Tax Rules**  | `LEGAL_POLICY_ADMIN`   | POST tax-rules                                                                                              |
| **Update**            | `PAYROLL_SPECIALIST`   | PUT pay-grades, allowances, pay-types, signing-bonuses, termination-benefits, policies, insurance-brackets  |
| **Update Tax Rules**  | `LEGAL_POLICY_ADMIN`   | PUT tax-rules                                                                                               |
| **Approve**           | `PAYROLL_MANAGER`      | POST approve (all except insurance-brackets)                                                                |
| **Approve Insurance** | `HR_MANAGER`           | POST insurance-brackets/:id/approve                                                                         |
| **Reject**            | `PAYROLL_MANAGER`      | POST reject (all except insurance-brackets)                                                                 |
| **Reject Insurance**  | `HR_MANAGER`           | POST insurance-brackets/:id/reject                                                                          |
| **Delete**            | `PAYROLL_MANAGER`      | DELETE (all except insurance-brackets)                                                                      |
| **Delete Insurance**  | `HR_MANAGER`           | DELETE insurance-brackets                                                                                   |
| **Company Settings**  | `SYSTEM_ADMIN`         | POST/PUT company-settings                                                                                   |
| **Dashboard Stats**   | `PAYROLL_MANAGER`      | GET stats, pending-approvals                                                                                |
| **Debug**             | `SYSTEM_ADMIN`         | GET debug/db                                                                                                |

**💡 TIP:** Create separate Postman environment variables for each role's token:

- `token_specialist` - For PAYROLL_SPECIALIST operations
- `token_manager` - For PAYROLL_MANAGER operations
- `token_hr_manager` - For HR_MANAGER operations (insurance brackets)
- `token_admin` - For SYSTEM_ADMIN operations
- `token_legal` - For LEGAL_POLICY_ADMIN operations (tax rules)

**Example:** Before testing "Create Pay Grade", login with a user that has `PAYROLL_SPECIALIST` role and use that token.

---

## 2. Pay Grades

### 2.1 Get All Pay Grades

**🔑 REQUIRED ROLE:** Any authenticated user (no specific role required)

**Request:**

- **Method:** `GET`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/pay-grades`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  ```
- **Query Parameters (Optional):**
  - `status` - Filter by status: `DRAFT`, `APPROVED`, `REJECTED`
  - `createdBy` - Filter by creator user ID
  - `page` - Page number (default: 1)
  - `limit` - Items per page (default: 10)

**Example:**

```
GET /payroll-configuration/pay-grades?status=DRAFT&page=1&limit=10
```

**Expected Response (200 OK):**

```json
{
  "data": [
    {
      "_id": "665f1c2b5b88c3d9b3c3b1aa",
      "grade": "A",
      "baseSalary": 6000,
      "grossSalary": 8000,
      "status": "DRAFT",
      "createdBy": {
        "_id": "665f1c2b5b88c3d9b3c3b1ab",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@company.com"
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### 2.2 Get Pay Grade by ID

**🔑 REQUIRED ROLE:** Any authenticated user (no specific role required)

**Request:**

- **Method:** `GET`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/pay-grades/:id`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  ```

**Example:**

```
GET /payroll-configuration/pay-grades/665f1c2b5b88c3d9b3c3b1aa
```

### 2.3 Create Pay Grade

**🔑 REQUIRED ROLE:** `PAYROLL_SPECIALIST`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `PAYROLL_SPECIALIST` role.

**Request:**

- **Method:** `POST`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/pay-grades`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "grade": "A",
    "baseSalary": 6000,
    "grossSalary": 8000
  }
  ```

**Validation Rules:**

- `baseSalary` must be ≥ 6000
- `grossSalary` must be ≥ 6000
- `grossSalary` must be ≥ `baseSalary`

**Expected Response (201 Created):**

```json
{
  "_id": "665f1c2b5b88c3d9b3c3b1aa",
  "grade": "A",
  "baseSalary": 6000,
  "grossSalary": 8000,
  "status": "DRAFT",
  "createdBy": "665f1c2b5b88c3d9b3c3b1ab",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 2.4 Update Pay Grade (DRAFT only)

**🔑 REQUIRED ROLE:** `PAYROLL_SPECIALIST`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `PAYROLL_SPECIALIST` role.

**Request:**

- **Method:** `PUT`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/pay-grades/:id`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "grade": "A+",
    "baseSalary": 6500,
    "grossSalary": 8500
  }
  ```

**Note:** All fields are optional. Only include fields you want to update.

### 2.5 Approve Pay Grade

**🔑 REQUIRED ROLE:** `PAYROLL_MANAGER`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `PAYROLL_MANAGER` role.

**Request:**

- **Method:** `POST`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/pay-grades/:id/approve`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "comment": "Approved after review"
  }
  ```

**Expected Response (200 OK):**

```json
{
  "_id": "665f1c2b5b88c3d9b3c3b1aa",
  "grade": "A",
  "baseSalary": 6000,
  "grossSalary": 8000,
  "status": "APPROVED",
  "approvedBy": "665f1c2b5b88c3d9b3c3b1ac",
  "approvedAt": "2024-01-01T00:00:00.000Z"
}
```

### 2.6 Reject Pay Grade

**🔑 REQUIRED ROLE:** `PAYROLL_MANAGER`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `PAYROLL_MANAGER` role.

**Request:**

- **Method:** `POST`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/pay-grades/:id/reject`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "comment": "Base salary too low"
  }
  ```

### 2.7 Delete Pay Grade

**🔑 REQUIRED ROLE:** `PAYROLL_MANAGER`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `PAYROLL_MANAGER` role.

**Request:**

- **Method:** `DELETE`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/pay-grades/:id`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  ```

**Note:** Cannot delete REJECTED items.

---

## 3. Allowances

### 3.1 Get All Allowances

**🔑 REQUIRED ROLE:** Any authenticated user (no specific role required)

**Request:**

- **Method:** `GET`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/allowances`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  ```
- **Query Parameters:** Same as Pay Grades

### 3.2 Get Allowance by ID

**🔑 REQUIRED ROLE:** Any authenticated user (no specific role required)

**Request:**

- **Method:** `GET`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/allowances/:id`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  ```

### 3.3 Create Allowance

**🔑 REQUIRED ROLE:** `PAYROLL_SPECIALIST`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `PAYROLL_SPECIALIST` role.

**Request:**

- **Method:** `POST`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/allowances`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "name": "Housing Allowance",
    "amount": 2000
  }
  ```

**Validation Rules:**

- `amount` must be ≥ 0

### 3.4 Update Allowance (DRAFT only)

**🔑 REQUIRED ROLE:** `PAYROLL_SPECIALIST`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `PAYROLL_SPECIALIST` role.

**Request:**

- **Method:** `PUT`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/allowances/:id`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "name": "Housing Allowance Updated",
    "amount": 2500
  }
  ```

### 3.5 Approve Allowance

**🔑 REQUIRED ROLE:** `PAYROLL_MANAGER`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `PAYROLL_MANAGER` role.

**Request:**

- **Method:** `POST`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/allowances/:id/approve`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "comment": "Approved"
  }
  ```

### 3.6 Reject Allowance

**🔑 REQUIRED ROLE:** `PAYROLL_MANAGER`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `PAYROLL_MANAGER` role.

**Request:**

- **Method:** `POST`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/allowances/:id/reject`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "comment": "Amount too high"
  }
  ```

### 3.7 Delete Allowance

**🔑 REQUIRED ROLE:** `PAYROLL_MANAGER`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `PAYROLL_MANAGER` role.

**Request:**

- **Method:** `DELETE`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/allowances/:id`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  ```

---

## 4. Pay Types

### 4.1 Get All Pay Types

**🔑 REQUIRED ROLE:** Any authenticated user (no specific role required)

**Request:**

- **Method:** `GET`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/pay-types`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  ```

### 4.2 Create Pay Type

**🔑 REQUIRED ROLE:** `PAYROLL_SPECIALIST`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `PAYROLL_SPECIALIST` role.

**Request:**

- **Method:** `POST`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/pay-types`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "type": "Monthly Salary",
    "amount": 10000
  }
  ```

**Validation Rules:**

- `amount` must be ≥ 6000

### 4.3 Approve/Reject/Delete Pay Type

**🔑 REQUIRED ROLE:** `PAYROLL_MANAGER` (for approve/reject/delete)

**⚠️ IMPORTANT:** Before testing approve/reject/delete endpoints, login with a user that has the `PAYROLL_MANAGER` role.

Same pattern as Pay Grades and Allowances.

---

## 5. Tax Rules

### 5.1 Get All Tax Rules

**🔑 REQUIRED ROLE:** Any authenticated user (no specific role required)

**Request:**

- **Method:** `GET`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/tax-rules`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  ```

### 5.2 Create Tax Rule

**🔑 REQUIRED ROLE:** `LEGAL_POLICY_ADMIN`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `LEGAL_POLICY_ADMIN` role.

**Request:**

- **Method:** `POST`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/tax-rules`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "name": "Income Tax",
    "description": "Standard income tax rate",
    "rate": 15.5
  }
  ```

**Validation Rules:**

- `rate` must be ≥ 0

### 5.3 Approve/Reject/Delete Tax Rule

**🔑 REQUIRED ROLE:** `PAYROLL_MANAGER` (for approve/reject/delete)

**⚠️ IMPORTANT:** Before testing approve/reject/delete endpoints, login with a user that has the `PAYROLL_MANAGER` role.

Same pattern as above.

---

## 6. Insurance Brackets

### 6.1 Get All Insurance Brackets

**🔑 REQUIRED ROLE:** Any authenticated user (no specific role required)

**Request:**

- **Method:** `GET`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/insurance-brackets`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  ```

### 6.2 Create Insurance Bracket

**🔑 REQUIRED ROLE:** `PAYROLL_SPECIALIST`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `PAYROLL_SPECIALIST` role.

**Request:**

- **Method:** `POST`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/insurance-brackets`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "name": "Bracket 1",
    "minSalary": 6000,
    "maxSalary": 10000,
    "employeeRate": 5.0,
    "employerRate": 10.0
  }
  ```

**Validation Rules:**

- `minSalary` must be < `maxSalary`
- `employeeRate` must be between 0 and 100
- `employerRate` must be between 0 and 100

### 6.3 Approve Insurance Bracket

**🔑 REQUIRED ROLE:** `HR_MANAGER`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `HR_MANAGER` role.

**Note:** Insurance brackets require HR_MANAGER approval (not PAYROLL_MANAGER).

---

## 7. Signing Bonuses

### 7.1 Get All Signing Bonuses

**🔑 REQUIRED ROLE:** Any authenticated user (no specific role required)

**Request:**

- **Method:** `GET`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/signing-bonuses`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  ```

### 7.2 Create Signing Bonus

**🔑 REQUIRED ROLE:** `PAYROLL_SPECIALIST`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `PAYROLL_SPECIALIST` role.

**Request:**

- **Method:** `POST`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/signing-bonuses`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "positionName": "Senior Developer",
    "amount": 5000
  }
  ```

**Validation Rules:**

- `amount` must be ≥ 0

---

## 8. Termination Benefits

### 8.1 Get All Termination Benefits

**🔑 REQUIRED ROLE:** Any authenticated user (no specific role required)

**Request:**

- **Method:** `GET`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/termination-benefits`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  ```

### 8.2 Create Termination Benefit

**🔑 REQUIRED ROLE:** `PAYROLL_SPECIALIST`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `PAYROLL_SPECIALIST` role.

**Request:**

- **Method:** `POST`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/termination-benefits`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "name": "Severance Pay",
    "amount": 10000,
    "terms": "Based on years of service"
  }
  ```

**Validation Rules:**

- `amount` must be ≥ 0
- `terms` is optional

---

## 9. Payroll Policies

### 9.1 Get All Payroll Policies

**🔑 REQUIRED ROLE:** Any authenticated user (no specific role required)

**Request:**

- **Method:** `GET`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/policies`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  ```

### 9.2 Create Payroll Policy

**🔑 REQUIRED ROLE:** `PAYROLL_SPECIALIST`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `PAYROLL_SPECIALIST` role.

**Request:**

- **Method:** `POST`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/policies`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  Content-Type: application/json
  ```
- **Body (JSON):**
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

**Validation Rules:**

- `percentage` must be between 0 and 100
- `fixedAmount` must be ≥ 0
- `thresholdAmount` must be ≥ 1

---

## 10. Company Settings

### 10.1 Get Company Settings

**🔑 REQUIRED ROLE:** Any authenticated user (no specific role required)

**Request:**

- **Method:** `GET`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/company-settings`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  ```

**Expected Response (200 OK):**

```json
{
  "_id": "665f1c2b5b88c3d9b3c3b1aa",
  "payDate": "2024-01-15T00:00:00.000Z",
  "timeZone": "Africa/Cairo",
  "currency": "EGP",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 10.2 Create Company Settings

**🔑 REQUIRED ROLE:** `SYSTEM_ADMIN`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `SYSTEM_ADMIN` role.

**Request:**

- **Method:** `POST`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/company-settings`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "payDate": "2024-01-15T00:00:00.000Z",
    "timeZone": "Africa/Cairo",
    "currency": "EGP"
  }
  ```

**Validation Rules:**

- `currency` must be "EGP" (only allowed value)
- Only one company settings record can exist

### 10.3 Update Company Settings

**🔑 REQUIRED ROLE:** `SYSTEM_ADMIN`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `SYSTEM_ADMIN` role.

**Request:**

- **Method:** `PUT`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/company-settings`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "payDate": "2024-01-20T00:00:00.000Z",
    "timeZone": "Africa/Cairo"
  }
  ```

---

## 11. Dashboard & Utilities

### 11.1 Get Configuration Statistics

**🔑 REQUIRED ROLE:** `PAYROLL_MANAGER`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `PAYROLL_MANAGER` role.

**Request:**

- **Method:** `GET`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/stats`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  ```

**Expected Response (200 OK):**

```json
{
  "payGrades": {
    "total": 10,
    "draft": 3,
    "approved": 6,
    "rejected": 1
  },
  "allowances": {
    "total": 5,
    "draft": 1,
    "approved": 4,
    "rejected": 0
  },
  "payTypes": { ... },
  "taxRules": { ... },
  "insuranceBrackets": { ... },
  "signingBonuses": { ... },
  "terminationBenefits": { ... },
  "payrollPolicies": { ... }
}
```

### 11.2 Get Pending Approvals

**🔑 REQUIRED ROLE:** `PAYROLL_MANAGER`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `PAYROLL_MANAGER` role.

**Request:**

- **Method:** `GET`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/pending-approvals`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  ```
- **Query Parameters (Optional):**
  - `userId` - Filter by creator user ID

**Expected Response (200 OK):**

```json
{
  "payGrades": [...],
  "allowances": [...],
  "payTypes": [...],
  "taxRules": [...],
  "insuranceBrackets": [...],
  "signingBonuses": [...],
  "terminationBenefits": [...],
  "policies": [...],
  "totalPending": 5
}
```

### 11.3 Debug Database Connection

**🔑 REQUIRED ROLE:** `SYSTEM_ADMIN`

**⚠️ IMPORTANT:** Before testing this endpoint, login with a user that has the `SYSTEM_ADMIN` role.

**Request:**

- **Method:** `GET`
- **URL:** `http://localhost:5000/api/v1/payroll-configuration/debug/db`
- **Headers:**
  ```
  Authorization: Bearer {{token}}
  ```

**Expected Response (200 OK):**

```json
{
  "database": "hr_system",
  "collections": [
    "paygrades",
    "allowances",
    "paytypes",
    ...
  ]
}
```

---

## 🧪 Testing Workflow Example

### Complete Workflow: Create → Update → Approve

**🔑 ROLE SWITCHING GUIDE:**

- You'll need to login with different users for different operations
- Keep track of tokens for different roles in Postman environment variables:
  - `token_specialist` - For PAYROLL_SPECIALIST operations
  - `token_manager` - For PAYROLL_MANAGER operations
  - `token_admin` - For SYSTEM_ADMIN operations

1. **Login as PAYROLL_SPECIALIST** (Get token)

   ```
   POST /api/v1/auth/login
   Body: { "employeeNumber": "EMP_SPECIALIST", "password": "password" }
   ```

   - Save token as `token_specialist` in Postman environment

2. **Create Pay Grade** (as PAYROLL_SPECIALIST)

   ```
   POST /api/v1/payroll-configuration/pay-grades
   Headers: Authorization: Bearer {{token_specialist}}
   ```

   - Save the `_id` from response

3. **Get Created Pay Grade** (Any authenticated user)

   ```
   GET /api/v1/payroll-configuration/pay-grades/{id}
   Headers: Authorization: Bearer {{token_specialist}}
   ```

   - Verify status is "DRAFT"

4. **Update Pay Grade** (as PAYROLL_SPECIALIST)

   ```
   PUT /api/v1/payroll-configuration/pay-grades/{id}
   Headers: Authorization: Bearer {{token_specialist}}
   ```

5. **Login as PAYROLL_MANAGER** (Switch user)

   ```
   POST /api/v1/auth/login
   Body: { "employeeNumber": "EMP_MANAGER", "password": "password" }
   ```

   - Save token as `token_manager` in Postman environment

6. **Approve Pay Grade** (as PAYROLL_MANAGER)

   ```
   POST /api/v1/payroll-configuration/pay-grades/{id}/approve
   Headers: Authorization: Bearer {{token_manager}}
   ```

   - Verify status changed to "APPROVED"

7. **Get All Pay Grades** (verify approval - Any authenticated user)
   ```
   GET /api/v1/payroll-configuration/pay-grades?status=APPROVED
   Headers: Authorization: Bearer {{token_manager}}
   ```

---

## ⚠️ Common Errors & Solutions

### 401 Unauthorized

- **Cause:** Missing or invalid token
- **Solution:** Login again and update the `{{token}}` variable

### 403 Forbidden

- **Cause:** User doesn't have required role
- **Solution:** Login with a user that has the correct role (PAYROLL_SPECIALIST, PAYROLL_MANAGER, etc.)

### 400 Bad Request

- **Cause:** Validation error (e.g., salary < 6000, grossSalary < baseSalary)
- **Solution:** Check validation rules and fix request body

### 404 Not Found

- **Cause:** Resource doesn't exist or invalid ObjectId
- **Solution:** Verify the ID is correct and resource exists

### 409 Conflict

- **Cause:** Trying to create company settings when they already exist
- **Solution:** Use PUT to update instead of POST

---

## 📝 Postman Collection Tips

1. **Create a Collection:** "Payroll Configuration API"
2. **Set Collection Variables:**
   - `base_url`: `http://localhost:5000/api/v1`
   - `token`: (set from login response)
3. **Use Variables in URLs:**
   ```
   {{base_url}}/payroll-configuration/pay-grades
   ```
4. **Create Folders:** Organize by resource type (Pay Grades, Allowances, etc.)
5. **Save Responses:** Use "Save Response" to create examples

---

## ✅ Testing Checklist

- [ ] Login and get token
- [ ] Test GET endpoints (list all, get by ID)
- [ ] Test POST endpoints (create)
- [ ] Test PUT endpoints (update DRAFT items)
- [ ] Test POST approve endpoints
- [ ] Test POST reject endpoints
- [ ] Test DELETE endpoints
- [ ] Test pagination and filtering
- [ ] Test validation errors
- [ ] Test role-based access control
- [ ] Test company settings (create/update)
- [ ] Test dashboard stats
- [ ] Test pending approvals

---

**Happy Testing! 🚀**
