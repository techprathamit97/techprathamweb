# Role-Based Access Control (RBAC) Implementation Guide

## Overview
This document describes the comprehensive RBAC system implemented across all API routes to ensure proper access control based on user roles: Admin, Trainer, and Student.

## Security Model

### User Roles & Permissions

#### 🔴 Admin (Full Access)
- **Access**: All APIs and system management functions
- **Can access**:
  - LMS management (`/api/lms/**`)
  - User management (students, trainers)
  - System administration (`/api/admin-**`, `/api/create-admin-user`, etc.)
  - Debug and analytics (`/api/debug/**`, `/api/attendance/**`)
  - Payment and invoice management (`/api/payments/**`, `/api/invoice/**`)
  - All BBB and course APIs

#### 🟡 Trainer (Limited Access)
- **Access**: Training-related functionality only
- **Can access**:
  - Trainer dashboard and profile (`/api/trainer/**`)
  - BBB meeting joins (`/api/bbb/join/**`)
  - Class management (`/api/module-class/join/**`, `/api/module-class/recordings/**`)
  - Assignment creation and management (excluding student uploads)
  - Attendance viewing (`/api/attendance/meetings/**`)
- **CANNOT access**:
  - ❌ Assignment upload endpoints (`/api/upload/assignments/**`)
  - ❌ Student management
  - ❌ System administration
  - ❌ Payment management

#### 🔵 Student (Specific Access)
- **Access**: Student-focused functionality
- **Can access**:
  - Student dashboard and profile (`/api/student/**`)
  - Assignment submissions (`/api/upload/assignments/**`) ✅
  - BBB meeting joins (`/api/bbb/join/**`)
  - Course content (`/api/course/fetch/**`)
  - Own assignment data only
- **CANNOT access**:
  - ❌ Other students' data
  - ❌ Administrative functions
  - ❌ Trainer functions

### Public Endpoints
- `/api/auth/**` - Login/logout endpoints (no authentication required)

## Frontend Integration

### 1. Authentication Headers
All authenticated API calls must include the user session in the Authorization header:

```typescript
import { getAuthHeaders, authenticatedFetch } from '@/lib/clientAuth';

// Method 1: Manual header inclusion
const headers = getAuthHeaders();
const response = await fetch('/api/lms/students', {
  headers: headers
});

// Method 2: Using helper function (recommended)
const response = await authenticatedFetch('/api/lms/students');
```

### 2. Login Process Updates
After successful login, store the complete user session:

```typescript
// In login success handler
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ loginId, password })
});

const result = await loginResponse.json();

if (result.success) {
  // Store complete session data
  const sessionData = {
    role: result.role,
    userId: result.user.userId,
    studentId: result.user.studentId,
    trainerId: result.user.trainerId,
    name: result.user.name,
    email: result.user.email,
    loginTime: new Date().toISOString()
  };
  
  localStorage.setItem('userSession', JSON.stringify(sessionData));
  
  // Redirect based on role
  window.location.href = result.redirectPath;
}
```

### 3. API Request Helpers
Use the provided client auth utilities:

```typescript
import { authGet, authPost, authPut, authDelete } from '@/lib/clientAuth';

// GET request
const students = await authGet('/api/lms/students');
const data = await students.json();

// POST request
const newStudent = await authPost('/api/lms/students', {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password123'
});

// File upload (assignments - students only)
const formData = new FormData();
formData.append('file', file);
const uploadResponse = await authenticatedFetch('/api/upload/assignments', {
  method: 'POST',
  body: formData
});
```

### 4. Role-Based UI Components
Check user roles in components:

```typescript
import { getCurrentUser, isAdmin, isTrainer, isStudent } from '@/lib/clientAuth';

function MyComponent() {
  const user = getCurrentUser();
  
  if (!user) {
    return <LoginPrompt />;
  }
  
  return (
    <div>
      {isAdmin() && <AdminPanel />}
      {isTrainer() && <TrainerDashboard />}
      {isStudent() && <StudentDashboard />}
      
      {/* Conditional features */}
      {isStudent() && <AssignmentUpload />}
      {isAdmin() && <UserManagement />}
    </div>
  );
}
```

## Security Enforcement

### Server-Side Validation
All API routes now include server-side authentication and authorization:

```typescript
// Example API route with RBAC
import { withAuth } from '@/lib/auth';

async function handleGet(req: NextRequest, authContext: AuthContext) {
  // authContext.user contains authenticated user data
  // Additional business logic validation can be added here
  
  if (authContext.user.role === 'trainer') {
    // Ensure trainer can only access their own data
    const trainerId = req.nextUrl.searchParams.get('trainerId');
    if (trainerId !== authContext.user.trainerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }
  
  // Process request...
}

export const GET = withAuth(handleGet, { roles: ['admin', 'trainer'] });
```

### Assignment Upload Security
Special handling for assignment uploads:

```typescript
// ✅ Students CAN upload assignments
export const POST = withAuth(handleUpload, { roles: ['admin', 'student'] });

// ❌ Trainers CANNOT access this endpoint - will receive 403 Forbidden
```

## Error Handling

### Common HTTP Status Codes
- `401 Unauthorized`: No valid authentication provided
- `403 Forbidden`: Valid auth but insufficient permissions
- `404 Not Found`: Resource doesn't exist or user lacks access
- `500 Internal Server Error`: Server-side authentication error

### Error Response Format
```json
{
  "error": "Access denied",
  "code": "FORBIDDEN", 
  "message": "You do not have permission to access this resource",
  "path": "/api/lms/students",
  "userRole": "trainer"
}
```

### Frontend Error Handling
```typescript
import { authenticatedFetch, logout } from '@/lib/clientAuth';

try {
  const response = await authenticatedFetch('/api/lms/students');
  
  if (!response.ok) {
    const error = await response.json();
    
    if (response.status === 401) {
      // Session expired or invalid
      logout();
      return;
    }
    
    if (response.status === 403) {
      // Insufficient permissions
      alert(`Access denied: ${error.message}`);
      return;
    }
    
    // Handle other errors...
  }
  
  const data = await response.json();
} catch (error) {
  console.error('API request failed:', error);
}
```

## Testing the Implementation

### Manual Testing Checklist

1. **Admin Access** ✅
   - [ ] Can access all LMS endpoints
   - [ ] Can manage students and trainers
   - [ ] Can access debug and analytics
   - [ ] Can manage payments and invoices

2. **Trainer Access** ⚠️
   - [ ] Can access trainer-specific endpoints
   - [ ] Can join BBB meetings
   - [ ] Can create assignments
   - [ ] **CANNOT** upload assignments (`/api/upload/assignments`)
   - [ ] **CANNOT** access student management

3. **Student Access** 👤
   - [ ] Can access student-specific endpoints
   - [ ] **CAN** upload assignments (`/api/upload/assignments`)
   - [ ] Can only see own assignment data
   - [ ] **CANNOT** access other students' data
   - [ ] **CANNOT** access administrative functions

4. **Authentication Flow** 🔐
   - [ ] Invalid session returns 401
   - [ ] Expired session redirects to login
   - [ ] Cross-role access attempts return 403
   - [ ] Public endpoints work without auth

### Test Scenarios

#### Scenario 1: Trainer Tries to Upload Assignment (Should Fail)
```bash
# Should return 403 Forbidden
curl -X POST /api/upload/assignments \
  -H "Authorization: Bearer {trainer_session_token}" \
  -F "file=@test.pdf"
```

#### Scenario 2: Student Uploads Assignment (Should Succeed)
```bash
# Should return 200 OK
curl -X POST /api/upload/assignments \
  -H "Authorization: Bearer {student_session_token}" \
  -F "file=@assignment.pdf"
```

#### Scenario 3: Admin Access All APIs (Should Succeed)
```bash
# All should return 200 OK
curl -H "Authorization: Bearer {admin_session_token}" /api/lms/students
curl -H "Authorization: Bearer {admin_session_token}" /api/lms/trainers
curl -H "Authorization: Bearer {admin_session_token}" /api/debug/bbb-analytics
```

## Migration Guide

### Existing Frontend Code Updates

1. **Replace direct fetch calls**:
   ```typescript
   // OLD
   const response = await fetch('/api/lms/students');
   
   // NEW
   const response = await authenticatedFetch('/api/lms/students');
   ```

2. **Update login handling**:
   ```typescript
   // Ensure session data includes all required fields
   const sessionData = {
     role: loginResult.role,
     userId: loginResult.user.userId,
     studentId: loginResult.user.studentId, 
     trainerId: loginResult.user.trainerId,
     name: loginResult.user.name,
     email: loginResult.user.email,
     loginTime: new Date().toISOString()
   };
   ```

3. **Add role-based conditionals**:
   ```typescript
   // Hide/show features based on roles
   {isTrainer() && !isAssignmentUploadPage && <TrainerContent />}
   {isStudent() && <AssignmentUploadButton />}
   ```

## Security Benefits

✅ **Centralized Authentication**: Single auth middleware for all APIs  
✅ **Role-Based Permissions**: Clear separation of admin/trainer/student access  
✅ **Assignment Upload Control**: Students can upload, trainers cannot  
✅ **Data Privacy**: Users can only access their own data  
✅ **Audit Trail**: All access attempts are logged  
✅ **Session Management**: Automatic session expiry and renewal  
✅ **Error Standardization**: Consistent error responses across APIs  

## Next Steps

1. Test all existing frontend functionality
2. Update any direct API calls to use authentication helpers
3. Add role-based conditional rendering where needed
4. Implement proper error handling for auth failures
5. Consider adding audit logging for sensitive operations

## Support

For questions or issues with the RBAC implementation:
- Check the console for authentication errors
- Verify session data format matches expected structure
- Ensure API calls use the authentication helpers
- Test with different user roles to confirm access patterns