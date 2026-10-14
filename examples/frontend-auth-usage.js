/**
 * Frontend Authentication Usage Examples
 * 
 * This file demonstrates how to integrate the new RBAC system
 * into existing frontend components and API calls.
 */

import { 
  authenticatedFetch, 
  authGet, 
  authPost, 
  getCurrentUser, 
  isAdmin, 
  isTrainer, 
  isStudent, 
  logout 
} from '@/lib/clientAuth';

// ===== 1. UPDATING EXISTING API CALLS =====

// OLD WAY (insecure)
async function fetchStudentsOld() {
  const response = await fetch('/api/lms/students');
  return response.json();
}

// NEW WAY (secure with RBAC)
async function fetchStudents() {
  try {
    const response = await authGet('/api/lms/students');
    return await response.json();
  } catch (error) {
    if (error.message === 'Insufficient permissions') {
      alert('You do not have permission to view students');
      return [];
    }
    throw error;
  }
}

// ===== 2. ROLE-BASED COMPONENT RENDERING =====

function Dashboard() {
  const user = getCurrentUser();
  
  if (!user) {
    return <LoginPrompt />;
  }

  return (
    <div className="dashboard">
      <h1>Welcome, {user.name}</h1>
      
      {/* Admin-only sections */}
      {isAdmin() && (
        <div className="admin-panel">
          <h2>Administration</h2>
          <AdminUserManagement />
          <AdminAnalytics />
          <SystemSettings />
        </div>
      )}
      
      {/* Trainer sections */}
      {isTrainer() && (
        <div className="trainer-panel">
          <h2>Training Dashboard</h2>
          <TrainerBatches />
          <AssignmentManager />
          {/* Note: Assignment upload is NOT available for trainers */}
        </div>
      )}
      
      {/* Student sections */}
      {isStudent() && (
        <div className="student-panel">
          <h2>Student Dashboard</h2>
          <StudentCourses />
          <AssignmentSubmissions />
          {/* Assignment upload IS available for students */}
          <AssignmentUpload />
        </div>
      )}
    </div>
  );
}

// ===== 3. SECURE FILE UPLOAD (STUDENTS ONLY) =====

function AssignmentUpload({ assignmentId }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Only show to students
  if (!isStudent()) {
    return <div>Access denied: Only students can upload assignments</div>;
  }

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      // Step 1: Upload file to S3
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await authenticatedFetch('/api/upload/assignments', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }
      
      const uploadResult = await uploadResponse.json();
      
      // Step 2: Submit assignment
      const user = getCurrentUser();
      const submitResponse = await authPost('/api/student/assignments', {
        studentId: user.studentId,
        assignmentId: assignmentId,
        fileUrl: uploadResult.url,
        fileName: uploadResult.fileName
      });
      
      if (submitResponse.ok) {
        alert('Assignment submitted successfully!');
        setFile(null);
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload assignment: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="assignment-upload">
      <input 
        type="file" 
        onChange={(e) => setFile(e.target.files[0])}
        accept=".pdf,.doc,.docx,.txt"
      />
      <button 
        onClick={handleUpload} 
        disabled={!file || uploading}
      >
        {uploading ? 'Uploading...' : 'Submit Assignment'}
      </button>
    </div>
  );
}

// ===== 4. TRAINER ASSIGNMENT MANAGEMENT (NO UPLOAD ACCESS) =====

function TrainerAssignments() {
  const [assignments, setAssignments] = useState([]);
  const user = getCurrentUser();

  // Only show to trainers and admins
  if (!isTrainer() && !isAdmin()) {
    return <div>Access denied</div>;
  }

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const response = await authGet(`/api/trainer/assignments?trainerId=${user.trainerId}`);
      const data = await response.json();
      setAssignments(data.data.assignments);
    } catch (error) {
      console.error('Failed to load assignments:', error);
    }
  };

  const createAssignment = async (assignmentData) => {
    try {
      const response = await authPost('/api/trainer/assignments', {
        trainerId: user.trainerId,
        ...assignmentData
      });
      
      if (response.ok) {
        alert('Assignment created successfully');
        loadAssignments(); // Refresh list
      }
    } catch (error) {
      console.error('Failed to create assignment:', error);
      alert('Failed to create assignment: ' + error.message);
    }
  };

  return (
    <div className="trainer-assignments">
      <h2>My Assignments</h2>
      
      {/* Note: Trainers CANNOT upload assignments for students */}
      <div className="info-box">
        <p>ℹ️ Students will upload their assignment submissions directly. 
           You can review and grade them once submitted.</p>
      </div>
      
      <AssignmentCreationForm onSubmit={createAssignment} />
      <AssignmentList assignments={assignments} />
    </div>
  );
}

// ===== 5. ADMIN USER MANAGEMENT =====

function AdminUserManagement() {
  const [students, setStudents] = useState([]);
  const [trainers, setTrainers] = useState([]);

  // Only show to admins
  if (!isAdmin()) {
    return <div>Access denied: Admin only</div>;
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // Admin can access all user management APIs
      const [studentsRes, trainersRes] = await Promise.all([
        authGet('/api/lms/students'),
        authGet('/api/lms/trainers')
      ]);
      
      setStudents(await studentsRes.json());
      setTrainers(await trainersRes.json());
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  return (
    <div className="admin-user-management">
      <h2>User Management</h2>
      
      <div className="user-sections">
        <div className="students-section">
          <h3>Students ({students.length})</h3>
          <StudentManagementTable students={students} />
        </div>
        
        <div className="trainers-section">
          <h3>Trainers ({trainers.length})</h3>
          <TrainerManagementTable trainers={trainers} />
        </div>
      </div>
    </div>
  );
}

// ===== 6. ERROR HANDLING PATTERNS =====

// Global error handler for authentication issues
function handleApiError(error, response) {
  if (response?.status === 401) {
    // Session expired or invalid
    alert('Your session has expired. Please log in again.');
    logout();
    return;
  }
  
  if (response?.status === 403) {
    // Insufficient permissions
    alert('You do not have permission to perform this action.');
    return;
  }
  
  // Other errors
  console.error('API Error:', error);
  alert('An error occurred: ' + error.message);
}

// Example usage with error handling
async function secureApiCall() {
  try {
    const response = await authGet('/api/lms/analytics');
    
    if (!response.ok) {
      await handleApiError(new Error('API call failed'), response);
      return;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    handleApiError(error);
  }
}

// ===== 7. LOGIN FLOW UPDATES =====

async function handleLogin(credentials) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    const result = await response.json();

    if (result.success) {
      // Store complete session data for RBAC
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
    } else {
      alert('Login failed: ' + result.error);
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('Login failed: ' + error.message);
  }
}

// ===== 8. COMPONENT ACCESS CONTROL =====

// Higher-order component for role protection
function withRoleProtection(WrappedComponent, allowedRoles) {
  return function ProtectedComponent(props) {
    const user = getCurrentUser();
    
    if (!user) {
      return <LoginPrompt />;
    }
    
    if (!allowedRoles.includes(user.role)) {
      return (
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You do not have permission to access this page.</p>
          <p>Required roles: {allowedRoles.join(', ')}</p>
          <p>Your role: {user.role}</p>
        </div>
      );
    }
    
    return <WrappedComponent {...props} />;
  };
}

// Usage examples
const AdminOnlyComponent = withRoleProtection(AdminPanel, ['admin']);
const TrainerStudentComponent = withRoleProtection(ClassView, ['trainer', 'student']);
const StudentOnlyComponent = withRoleProtection(AssignmentUpload, ['student']);

// ===== 9. NAVIGATION MENU WITH ROLE FILTERING =====

function NavigationMenu() {
  const user = getCurrentUser();
  
  if (!user) return null;

  const menuItems = [
    // Common items
    { path: '/dashboard', label: 'Dashboard', roles: ['admin', 'trainer', 'student'] },
    
    // Admin-only items
    { path: '/lms/students', label: 'Students', roles: ['admin'] },
    { path: '/lms/trainers', label: 'Trainers', roles: ['admin'] },
    { path: '/lms/analytics', label: 'Analytics', roles: ['admin'] },
    { path: '/lms/payments', label: 'Payments', roles: ['admin'] },
    
    // Trainer items
    { path: '/trainer/assignments', label: 'Assignments', roles: ['admin', 'trainer'] },
    { path: '/trainer/batches', label: 'My Batches', roles: ['trainer'] },
    
    // Student items
    { path: '/student/courses', label: 'Courses', roles: ['student'] },
    { path: '/student/assignments', label: 'Assignments', roles: ['student'] },
  ];

  const accessibleItems = menuItems.filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <nav className="navigation">
      {accessibleItems.map(item => (
        <a key={item.path} href={item.path}>
          {item.label}
        </a>
      ))}
      
      <button onClick={logout} className="logout-button">
        Logout
      </button>
    </nav>
  );
}

export {
  fetchStudents,
  Dashboard,
  AssignmentUpload,
  TrainerAssignments,
  AdminUserManagement,
  handleLogin,
  withRoleProtection,
  NavigationMenu
};