import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import StudentLogin from './components/student/Login';
import StudentDashboard from './components/student/Dashboard';
import FaceVerification from './components/student/FaceVerification';
import AdminLogin from './components/admin/Login';
import AdminRegister from './components/admin/Register';
import AdminDashboard from './components/admin/Dashboard';
import ManageStudents from './components/admin/ManageStudents';
import ManageElections from './components/admin/ManageElections';
import ManagePositions from './components/admin/ManagePositions';
import ManageCandidates from './components/admin/ManageCandidates';
import StudentRegister from './components/student/Register';
import FaceRegistration from './components/student/FaceRegistration';
import ActiveElections from './components/student/ActiveElections';

// Protected Route Component for Students
const StudentProtectedRoute = ({ children }) => {
  const studentToken = localStorage.getItem('studentToken');
  const userType = localStorage.getItem('userType');
  
  if (!studentToken || userType !== 'student') {
    return <Navigate to="/login" />;
  }
  
  return children;
};

// Protected Route Component for Admins
const AdminProtectedRoute = ({ children }) => {
  const adminToken = localStorage.getItem('adminToken');
  const userType = localStorage.getItem('userType');
  
  if (!adminToken || userType !== 'admin') {
    return <Navigate to="/admin/login" />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<StudentLogin />} />
        <Route path="/register" element={<StudentRegister />} />
        <Route path="/face-registration" element={<FaceRegistration />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/register" element={<AdminRegister />} />

        {/* Protected Student Routes */}
        <Route path="/face-verification" element={
          <StudentProtectedRoute>
            <FaceVerification />
          </StudentProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <StudentProtectedRoute>
            <StudentDashboard />
          </StudentProtectedRoute>
        } />
        <Route path="/elections" element={
          <StudentProtectedRoute>
            <ActiveElections />
          </StudentProtectedRoute>
        } />
        
        {/* Protected Admin Routes */}
        <Route path="/admin/dashboard" element={
          <AdminProtectedRoute>
            <AdminDashboard />
          </AdminProtectedRoute>
        } />
        <Route path="/admin/students" element={
          <AdminProtectedRoute>
            <ManageStudents />
          </AdminProtectedRoute>
        } />
        <Route path="/admin/elections" element={
          <AdminProtectedRoute>
            <ManageElections />
          </AdminProtectedRoute>
        } />
        <Route path="/admin/positions" element={
          <AdminProtectedRoute>
            <ManagePositions />
          </AdminProtectedRoute>
        } />
        <Route path="/admin/candidates" element={
          <AdminProtectedRoute>
            <ManageCandidates />
          </AdminProtectedRoute>
        } />
        
        {/* Default redirect */}
        <Route path="/" element={
          localStorage.getItem('userType') === 'admin' 
            ? <Navigate to="/admin/dashboard" />
            : <Navigate to="/login" />
        } />
        
        {/* Catch all route - redirect based on user type */}
        <Route path="*" element={
          localStorage.getItem('userType') === 'admin'
            ? <Navigate to="/admin/dashboard" />
            : localStorage.getItem('userType') === 'student'
              ? <Navigate to="/dashboard" />
              : <Navigate to="/login" />
        } />
      </Routes>
    </Router>
  );
}

export default App;
