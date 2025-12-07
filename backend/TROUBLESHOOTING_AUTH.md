# 🔧 Troubleshooting Authentication Issues

## Error: "Invalid or missing token" (401 Unauthorized)

This error means your request is missing a valid JWT token. Follow these steps:

---

## ✅ Step-by-Step Fix

### Step 1: Login First

**You MUST login before accessing any payroll-configuration endpoints.**

1. **Request:**

   ```
   POST http://localhost:5000/api/v1/auth/login
   ```

2. **Headers:**

   ```
   Content-Type: application/json
   ```

3. **Body:**

   ```json
   {
     "employeeNumber": "YOUR_EMPLOYEE_NUMBER",
     "password": "YOUR_PASSWORD"
   }
   ```

4. **Expected Response:**
   ```json
   {
     "message": "Login successful",
     "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": {
       "id": "...",
       "employeeNumber": "...",
       "roles": ["Payroll Specialist"]
     }
   }
   ```

### Step 2: Copy the Token

Copy the `access_token` value from the login response.

### Step 3: Set Up Postman Authorization

**Option A: Using Environment Variable (Recommended)**

1. In Postman, click on **Environments** (left sidebar)
2. Create a new environment or select existing one
3. Add a variable:
   - **Variable Name:** `token`
   - **Initial Value:** (leave empty)
   - **Current Value:** Paste your `access_token` here
4. Save the environment
5. Make sure the environment is selected (top right dropdown)

6. In your request, go to **Authorization** tab:
   - Type: **Bearer Token**
   - Token: `{{token}}`

**Option B: Manual Header**

1. Go to **Headers** tab in your request
2. Add header:
   - **Key:** `Authorization`
   - **Value:** `Bearer YOUR_TOKEN_HERE`
   - Replace `YOUR_TOKEN_HERE` with the actual token from login

### Step 4: Verify Token Format

The Authorization header should look exactly like this:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NjVmMWMyYjViODhjM2Q5YjNjM2IxYWIiLCJ1c2VybmFtZSI6IkVNUDAwMSIsImlhdCI6MTY3MjU2NzIwMCwiZXhwIjoxNjcyNTcwODAwfQ...
```

**Important:**

- Must start with `Bearer ` (with a space after Bearer)
- No quotes around the token
- No extra spaces
- Token should be a long string (usually 200+ characters)

---

## 🔍 Common Issues & Solutions

### Issue 1: Token Not Set in Postman

**Symptom:** Getting 401 error

**Solution:**

- Check if you've added the Authorization header
- Verify the environment variable is set correctly
- Make sure the environment is selected

### Issue 2: Token Expired

**Symptom:** Token was working before, now getting 401

**Solution:**

- Tokens expire after a certain time (usually 1 hour)
- Login again to get a new token
- Update your Postman environment variable with the new token

### Issue 3: Wrong Token Format

**Symptom:** Token is set but still getting 401

**Check:**

- ❌ `Authorization: {{token}}` (missing "Bearer ")
- ❌ `Authorization: Bearer{{token}}` (missing space)
- ❌ `Authorization: "Bearer {{token}}"` (quotes not needed)
- ✅ `Authorization: Bearer {{token}}` (correct)

### Issue 4: Environment Variable Not Working

**Symptom:** `{{token}}` is not being replaced

**Solution:**

1. Check environment is selected (top right dropdown in Postman)
2. Verify variable name is exactly `token` (case-sensitive)
3. Try typing `{{token}}` manually (don't copy-paste)
4. Check if variable has a value (click on eye icon next to variable)

### Issue 5: Server Not Running

**Symptom:** Can't even login

**Solution:**

1. Make sure your server is running:
   ```bash
   npm run start:dev
   ```
2. Check server is on correct port (default: 5000)
3. Verify base URL: `http://localhost:5000/api/v1`

---

## 🧪 Quick Test

### Test 1: Can You Login?

```
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "employeeNumber": "EMP001",
  "password": "password"
}
```

**If this fails:**

- Check server is running
- Verify employee number and password are correct
- Check database connection

### Test 2: Is Token Being Sent?

After login, try a simple GET request:

```
GET http://localhost:5000/api/v1/payroll-configuration/pay-grades
Authorization: Bearer YOUR_TOKEN_HERE
```

**If this fails:**

- Copy token directly from login response
- Paste it manually in the Authorization header
- Make sure "Bearer " prefix is included

### Test 3: Check Token in Postman Console

1. Open Postman Console (View → Show Postman Console)
2. Send your request
3. Check the "Request Headers" section
4. Verify you see:
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## 📝 Complete Example Workflow

### 1. Login Request

**Request:**

```
POST http://localhost:5000/api/v1/auth/login
```

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "employeeNumber": "EMP001",
  "password": "your_password"
}
```

**Response:**

```json
{
  "message": "Login successful",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NjVmMWMyYjViODhjM2Q5YjNjM2IxYWIiLCJ1c2VybmFtZSI6IkVNUDAwMSIsImlhdCI6MTY3MjU2NzIwMCwiZXhwIjoxNjcyNTcwODAwfQ.example_signature",
  "user": {
    "id": "665f1c2b5b88c3d9b3c3b1ab",
    "employeeNumber": "EMP001",
    "fullName": "John Doe",
    "workEmail": "john.doe@company.com",
    "roles": ["Payroll Specialist"]
  }
}
```

### 2. Use Token in Next Request

**Request:**

```
GET http://localhost:5000/api/v1/payroll-configuration/pay-grades
```

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NjVmMWMyYjViODhjM2Q5YjNjM2IxYWIiLCJ1c2VybmFtZSI6IkVNUDAwMSIsImlhdCI6MTY3MjU2NzIwMCwiZXhwIjoxNjcyNTcwODAwfQ.example_signature
```

---

## 🎯 Postman Setup Checklist

- [ ] Server is running (`npm run start:dev`)
- [ ] Can access login endpoint
- [ ] Login request returns `access_token`
- [ ] Created Postman environment
- [ ] Added `token` variable to environment
- [ ] Pasted token value into variable
- [ ] Selected the environment (top right dropdown)
- [ ] Added Authorization header to request
- [ ] Set Authorization type to "Bearer Token"
- [ ] Used `{{token}}` in token field
- [ ] Verified token format in request (check console)

---

## 💡 Pro Tips

1. **Use Postman Environments:** Create separate environments for different users/roles
   - Environment: "Payroll Specialist"
   - Environment: "Payroll Manager"
   - Environment: "System Admin"

2. **Auto-Update Token:** Use Postman scripts to automatically extract and save token:

   ```javascript
   // In Tests tab of login request:
   pm.environment.set('token', pm.response.json().access_token);
   ```

3. **Check Token Expiry:** If token expires frequently, check JWT configuration in your auth service

4. **Use Collection Variables:** For base URL and other common values

---

## 🆘 Still Not Working?

If you've tried everything above and still getting 401:

1. **Check JWT Secret:** Make sure `JWT_SECRET` is set in your `.env` file
2. **Check Server Logs:** Look for authentication errors in console
3. **Verify User Exists:** Make sure the employee number exists in database
4. **Check Password:** Verify password is correct (check if it's hashed in database)
5. **Database Connection:** Ensure MongoDB connection is working

---

**Need more help?** Check the server console for detailed error messages!
