// src/App.js - Updated with StudentVotingPage
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './components/Login';
// Admin components
import AdminDashboard from './components/AdminDashboard';
import AdminStudents from './components/AdminStudents';
import AdminCandidates from './components/AdminCandidates';
import AdminPositions from './components/AdminPositions';
import AdminResults from './components/AdminResults';
// Student components
import StudentProfile from './components/StudentProfile';
import StudentDashboard from './components/StudentDashboard';
import StudentResults from './components/StudentResults';
import StudentVotingPage from './components/StudentVotingPage';

// Protected routes for admin
function ProtectedAdminRoute({ children }) {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/" />;
  }
  
  return children;
}

// Protected routes for students
function ProtectedStudentRoute({ children }) {
  const studentEmail = localStorage.getItem('studentEmail');
  
  if (!studentEmail) {
    return <Navigate to="/" />;
  }
  
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Main Login Page */}
          <Route path="/" element={<Login />} />
          
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          } />
          <Route path="/admin/students" element={
            <ProtectedAdminRoute>
              <AdminStudents />
            </ProtectedAdminRoute>
          } />
          <Route path="/admin/candidates" element={
            <ProtectedAdminRoute>
              <AdminCandidates />
            </ProtectedAdminRoute>
          } />
          <Route path="/admin/positions" element={
            <ProtectedAdminRoute>
              <AdminPositions />
            </ProtectedAdminRoute>
          } />
          <Route path="/admin/results" element={
            <ProtectedAdminRoute>
              <AdminResults />
            </ProtectedAdminRoute>
          } />
          
          {/* Student Routes */}
          <Route path="/student/profile" element={
            <ProtectedStudentRoute>
              <StudentProfile />
            </ProtectedStudentRoute>
          } />
          <Route path="/student/dashboard" element={
            <ProtectedStudentRoute>
              <StudentDashboard />
            </ProtectedStudentRoute>
          } />
          <Route path="/student/results" element={
            <ProtectedStudentRoute>
              <StudentResults />
            </ProtectedStudentRoute>
          } />
          <Route path="/student/vote/:positionId" element={
            <ProtectedStudentRoute>
              <StudentVotingPage />
            </ProtectedStudentRoute>
          } />

          {/* Catch all - redirect to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;